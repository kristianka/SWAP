import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:dev@localhost:5432/payments";

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const initDatabase = async (): Promise<void> => {
  try {
    // Create domain events table (internal event store)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_events (
        id SERIAL PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL
      )
    `);

    // Create payments table (current state)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Create idempotency table for external event processing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_key TEXT PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Payment database initialised");
  } catch (error) {
    console.error("Failed to initialise payment database:", error);
    throw error;
  }
};
