import { pool } from "../db";
import { PaymentStatus } from "@swap/shared";

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

/**
 * Add a new payment record
 */
export const addPayment = async (payment: Payment): Promise<void> => {
  await pool.query(
    `
    INSERT INTO payments
      (id, order_id, amount, status)
    VALUES ($1, $2, $3, $4)
    `,
    [payment.id, payment.order_id, payment.amount, payment.status],
  );
};

/**
 * Get all payments
 */
export const getPayments = async (): Promise<Payment[]> => {
  const result = await pool.query(`
    SELECT
      *
    FROM
      payments
    ORDER BY
      created_at DESC
  `);
  return result.rows;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (id: string): Promise<Payment | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      payments
    WHERE
      id = $1
    `,
    [id],
  );
  if (result.rows.length === 0) return undefined;
  return result.rows[0];
};

/**
 * Get payment by order ID
 */
export const getPaymentByOrderId = async (orderId: string): Promise<Payment | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      payments
    WHERE
      order_id = $1
    ORDER BY
      created_at DESC
    LIMIT 1
    `,
    [orderId],
  );
  if (result.rows.length === 0) return undefined;
  return result.rows[0];
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (id: string, status: PaymentStatus): Promise<boolean> => {
  const result = await pool.query(
    `
    UPDATE
      payments
    SET
      status = $1,
      updated_at = CURRENT_TIMESTAMP,
      version = version + 1
    WHERE
      id = $2
    `,
    [status, id],
  );
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Reset payments (for testing) - clears all payments and idempotency records
 */
export const resetPayments = async (): Promise<void> => {
  await pool.query(`DELETE FROM payments`);
  await pool.query(`DELETE FROM processed_events`);
};
