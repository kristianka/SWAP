import type { Order } from "@swap/shared";
import type { OrderStatus } from "@swap/shared";
import { pool } from "../db";

export const addOrder = async (order: Order): Promise<void> => {
  await pool.query(
    `
    INSERT INTO orders
      (id, session_id, saga_id, items, status, error_message, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      order.id,
      order.sessionId,
      order.sagaId,
      JSON.stringify(order.items),
      order.status,
      order.errorMessage || null,
      order.createdAt,
    ],
  );
};

export const getOrders = async (sessionId: string): Promise<Order[]> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      orders
    WHERE
      session_id = $1
    ORDER BY
      created_at DESC
  `,
    [sessionId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    sagaId: row.saga_id,
    items: row.items,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
};

export const getOrderById = async (sessionId: string, id: string): Promise<Order | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      orders
    WHERE
      id = $1 AND session_id = $2
    `,
    [id, sessionId],
  );
  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  return {
    sagaId: row.saga_id,
    id: row.id,
    sessionId: row.session_id,
    items: row.items,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
};

export const updateOrderStatus = async (
  sessionId: string,
  orderId: string,
  status: OrderStatus,
  errorMessage?: string,
): Promise<boolean> => {
  const result = await pool.query(
    `
    UPDATE
      orders
    SET
      status = $1,
      error_message = $2
    WHERE
      id = $3 AND session_id = $4
    `,
    [status, errorMessage || null, orderId, sessionId],
  );
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Reset orders (for testing) - clears all orders and idempotency records
 */
export const resetOrders = async (sessionId: string): Promise<void> => {
  await pool.query(`DELETE FROM orders WHERE session_id = $1`, [sessionId]);
  await pool.query(`DELETE FROM processed_events WHERE session_id = $1`, [sessionId]);
};
