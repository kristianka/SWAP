// Idempotency storage - tracks processed events to prevent duplicate processing
import { pool } from "../db";

/**
 * Check if an event/order has already been processed
 * @param key - Unique identifier (typically orderId or eventId)
 * @returns true if already processed
 */
export const hasProcessed = async (key: string): Promise<boolean> => {
  const result = await pool.query(
    `
    SELECT
      1
    FROM
      processed_events
    WHERE
      event_key = $1`,
    [key],
  );
  return result.rows.length > 0;
};

/**
 * Mark an event/order as processed
 * @param key - Unique identifier to mark as processed
 */
export const markProcessed = async (key: string): Promise<void> => {
  await pool.query(
    `INSERT INTO
      processed_events (event_key)
    VALUES ($1)
    ON CONFLICT (event_key) DO NOTHING`,
    [key],
  );
};

/**
 * Remove from processed set (for testing or compensation)
 * @param key - Unique identifier to remove
 */
export const removeProcessed = async (key: string): Promise<void> => {
  await pool.query(
    `
    DELETE FROM
      processed_events
    WHERE
      event_key = $1
    `,
    [key],
  );
};

/**
 * Get count of processed events (for monitoring)
 */
export const getProcessedCount = async (): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) as count
    FROM 
      processed_events
    `,
  );
  return parseInt(result.rows[0].count, 10);
};
