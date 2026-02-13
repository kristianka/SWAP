import { pool } from "./db";
import { OrderStatus, OrderEventType, QUEUES } from "@swap/shared";
import type { OrderEvent } from "@swap/shared";
import { getChannel } from "./rabbitmq";

/**
 * Order timeout configuration
 * Orders stuck in PENDING for longer than this will be auto-cancelled
 */
const ORDER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

/**
 * Background job that checks for stuck orders and cancels them
 * This prevents orders from being stuck in PENDING indefinitely
 * due to service failures, network issues, or queue problems
 */
export const startOrderTimeoutMonitor = () => {
  const monitor = async () => {
    try {
      const timeoutThreshold = new Date(Date.now() - ORDER_TIMEOUT_MS).toISOString();

      // Find orders that are stuck in PENDING beyond the timeout
      const result = await pool.query(
        `
            UPDATE
                orders
            SET 
                status = $1,
                error_message = $2
            WHERE 
                status = $3
            AND
                created_at < $4
            RETURNING 
                id, saga_id, session_id, items, created_at
        `,
        [
          OrderStatus.CANCELLED,
          "Order timeout: No response from inventory/payment services within expected time",
          OrderStatus.PENDING,
          timeoutThreshold,
        ],
      );

      if (result.rowCount && result.rowCount > 0) {
        console.warn(
          `Timeout monitor: Cancelled ${result.rowCount} stuck order(s)`,
          result.rows.map((r) => r.id),
        );

        // Publish ORDER_CANCELLED events to trigger saga compensation
        const channel = getChannel();
        for (const row of result.rows) {
          const cancelEvent: OrderEvent = {
            type: OrderEventType.ORDER_CANCELLED,
            correlationId: row.saga_id || row.id, // Use saga_id if available
            sessionId: row.session_id,
            timestamp: new Date().toISOString(),
            data: {
              id: row.id,
              sagaId: row.saga_id || row.id,
              sessionId: row.session_id,
              items: row.items || [],
              status: OrderStatus.CANCELLED,
              createdAt: row.created_at,
              errorMessage:
                "Order timeout: No response from inventory/payment services within expected time",
            },
          };

          channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(cancelEvent)));
          console.log(`[timeout] Published ORDER_CANCELLED for order ${row.id}`);
        }
      }
    } catch (error) {
      console.error("Error in order timeout monitor:", error);
    }
  };

  // Run immediately on startup
  monitor();

  // Then run periodically
  const intervalId = setInterval(monitor, CHECK_INTERVAL_MS);

  console.log(
    `Order timeout monitor started (timeout: ${ORDER_TIMEOUT_MS / 1000}s, check interval: ${CHECK_INTERVAL_MS / 1000}s)`,
  );

  return intervalId;
};
