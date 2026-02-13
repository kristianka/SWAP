import { pool } from "../db";
import { PaymentStatus } from "@swap/shared";

export interface Payment {
  id: string;
  session_id?: string;
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
export const addPayment = async (sessionId: string, payment: Payment): Promise<void> => {
  await pool.query(
    `
    INSERT INTO payments
      (id, session_id, order_id, amount, status)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [payment.id, sessionId, payment.order_id, payment.amount, payment.status],
  );
};

/**
 * Get all payments
 */
export const getPayments = async (sessionId: string): Promise<Payment[]> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      payments
    WHERE
      session_id = $1
    ORDER BY
      created_at DESC
  `,
    [sessionId],
  );
  return result.rows;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (
  sessionId: string,
  id: string,
): Promise<Payment | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      payments
    WHERE
      id = $1 AND session_id = $2
    `,
    [id, sessionId],
  );
  if (result.rows.length === 0) return undefined;
  return result.rows[0];
};

/**
 * Get payment by order ID
 */
export const getPaymentByOrderId = async (
  sessionId: string,
  orderId: string,
): Promise<Payment | undefined> => {
  const result = await pool.query(
    `
    SELECT
      *
    FROM
      payments
    WHERE
      order_id = $1 AND session_id = $2
    ORDER BY
      created_at DESC
    LIMIT 1
    `,
    [orderId, sessionId],
  );
  if (result.rows.length === 0) return undefined;
  return result.rows[0];
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  sessionId: string,
  id: string,
  status: PaymentStatus,
): Promise<boolean> => {
  const result = await pool.query(
    `
    UPDATE
      payments
    SET
      status = $1,
      updated_at = CURRENT_TIMESTAMP,
      version = version + 1
    WHERE
      id = $2 AND session_id = $3
    `,
    [status, id, sessionId],
  );
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Reset payments (for testing) - clears all payments and idempotency records
 */
export const resetPayments = async (sessionId: string): Promise<void> => {
  await pool.query(`DELETE FROM payments WHERE session_id = $1`, [sessionId]);
  await pool.query(`DELETE FROM processed_events`);
};
