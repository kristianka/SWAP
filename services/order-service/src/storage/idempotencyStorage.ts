// Idempotency storage - tracks processed events to prevent duplicate processing
// In production, this would be backed by Redis or a database

const processedEvents = new Set<string>();

/**
 * Check if an event/order has already been processed
 * @param key - Unique identifier (typically orderId or eventId)
 * @returns true if already processed
 */
export const hasProcessed = (key: string): boolean => {
  return processedEvents.has(key);
};

/**
 * Mark an event/order as processed
 * @param key - Unique identifier to mark as processed
 */
export const markProcessed = (key: string): void => {
  processedEvents.add(key);
};

/**
 * Remove from processed set (for testing or compensation)
 * @param key - Unique identifier to remove
 */
export const removeProcessed = (key: string): void => {
  processedEvents.delete(key);
};

/**
 * Get count of processed events (for monitoring)
 */
export const getProcessedCount = (): number => {
  return processedEvents.size;
};
