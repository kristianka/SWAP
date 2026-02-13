import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:dev@localhost:5432/orders";

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

    // Create orders table (current state)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT,
        session_id TEXT NOT NULL,
        saga_id TEXT NOT NULL,
        items JSONB NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL,
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
          WHERE table_name = 'orders' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey;
          ALTER TABLE orders ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default';
          ALTER TABLE orders ADD PRIMARY KEY (id, session_id);
        END IF;
      END $$;
    `);

    // Create index on session_id for efficient queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
    `);

    // Add saga_id column if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'saga_id'
        ) THEN
          ALTER TABLE orders ADD COLUMN saga_id TEXT;
        END IF;
      END $$;
    `);

    // Add error_message column if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'error_message'
        ) THEN
          ALTER TABLE orders ADD COLUMN error_message TEXT;
        END IF;
      END $$;
    `);

    // Create index on saga_id for efficient tracing
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_saga_id ON orders(saga_id);
    `);

    // Create idempotency table for external event processing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_key TEXT,
        session_id TEXT NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_key, session_id)
      )
    `);

    // Add session_id column to processed_events if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'processed_events' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE processed_events DROP CONSTRAINT IF EXISTS processed_events_pkey;
          ALTER TABLE processed_events ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default';
          ALTER TABLE processed_events ADD PRIMARY KEY (event_key, session_id);
        END IF;
      END $$;
    `);

    // Create index on session_id for processed_events
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_events_session ON processed_events(session_id);
    `);

    console.log("Order database initialised");
  } catch (error) {
    console.error("Failed to initialize order database:", error);
    throw error;
  }
};
