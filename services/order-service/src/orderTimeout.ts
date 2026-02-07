import { pool } from "./db";
import { OrderStatus } from "@swap/shared";

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
                id
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
