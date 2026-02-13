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
        id TEXT,
        session_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (id, session_id)
      )
    `);

    // Add session_id column if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_pkey;
          ALTER TABLE payments ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default';
          ALTER TABLE payments ADD PRIMARY KEY (id, session_id);
        END IF;
      END $$;
    `);

    // Create index on session_id for efficient queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
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
