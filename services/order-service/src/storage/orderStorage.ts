import type { Order } from "@swap/shared";
import type { OrderStatus } from "@swap/shared";
import { pool } from "../db";

export const addOrder = async (order: Order): Promise<void> => {
  await pool.query(
    `
    INSERT INTO orders
      (id, items, status, created_at)
    VALUES ($1, $2, $3, $4)
    `,
    [order.id, JSON.stringify(order.items), order.status, order.createdAt],
  );
};

export const getOrders = async (): Promise<Order[]> => {
  const result = await pool.query(`
    SELECT
      *
    FROM
      orders
    ORDER BY
      created_at DESC
  `);
  return result.rows.map((row) => ({
    id: row.id,
    items: row.items,
    status: row.status,
    createdAt: row.created_at,
  }));
};

export const getOrderById = async (id: string): Promise<Order | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      orders
    WHERE
      id = $1
    `,
    [id],
  );
  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  return {
    id: row.id,
    items: row.items,
    status: row.status,
    createdAt: row.created_at,
  };
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<boolean> => {
  const result = await pool.query(
    `
    UPDATE
      orders
    SET
      status = $1
    WHERE
      id = $2
    `,
    [status, orderId],
  );
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Reset orders (for testing) - clears all orders and idempotency records
 */
export const resetOrders = async (): Promise<void> => {
  await pool.query(`DELETE FROM orders`);
  await pool.query(`DELETE FROM processed_events`);
};
