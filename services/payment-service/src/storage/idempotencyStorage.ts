// Idempotency storage: tracks processed events to prevent duplicate processing
import { pool } from "../db";

/**
 * Check if an event/order has already been processed
 * @param sessionId - Session identifier
 * @param key - Unique identifier (typically orderId or eventId)
 * @returns true if already processed
 */
export const hasProcessed = async (sessionId: string, key: string): Promise<boolean> => {
  const result = await pool.query(
    `
    SELECT
      1 
    FROM
      processed_events 
    WHERE event_key = $1 AND session_id = $2`,
    [key, sessionId],
  );
  return result.rows.length > 0;
};

/**
 * Mark an event/order as processed
 * @param sessionId - Session identifier
 * @param key - Unique identifier to mark as processed
 */
export const markProcessed = async (sessionId: string, key: string): Promise<void> => {
  await pool.query(
    `INSERT INTO 
      processed_events (event_key, session_id)
    VALUES ($1, $2)
      ON CONFLICT (event_key, session_id) DO NOTHING`,
    [key, sessionId],
  );
};

/**
 * Remove from processed set (for compensation flows)
 * @param sessionId - Session identifier
 * @param key - Unique identifier to remove
 */
export const removeProcessed = async (sessionId: string, key: string): Promise<void> => {
  await pool.query(
    `
    DELETE FROM
      processed_events
    WHERE
      event_key = $1 AND session_id = $2`,
    [key, sessionId],
  );
};

/**
 * Get count of processed events (for monitoring)
 * @param sessionId - Session identifier
 */
export const getProcessedCount = async (sessionId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT
      COUNT(*) as count
    FROM
      processed_events
    WHERE
      session_id = $1`,
    [sessionId],
  );
  return parseInt(result.rows[0].count, 10);
};
