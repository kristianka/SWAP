import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:dev@localhost:5434/inventory";

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

    // Create products table (current state)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        stock_level INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0,
        available INTEGER GENERATED ALWAYS AS (stock_level - reserved) STORED,
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
          WHERE table_name = 'products' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;
          ALTER TABLE products ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default';
          ALTER TABLE products ADD PRIMARY KEY (id, session_id);
        END IF;
      END $$;
    `);

    // Create index on session_id for efficient queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_session ON products(session_id);
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

    // Create reservations table to track inventory reservations per order
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        order_id TEXT,
        session_id TEXT NOT NULL,
        items JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP,
        PRIMARY KEY (order_id, session_id)
      )
    `);

    // Add session_id column to reservations if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_pkey;
          ALTER TABLE reservations ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default';
          ALTER TABLE reservations ADD PRIMARY KEY (order_id, session_id);
        END IF;
      END $$;
    `);

    // Create index on session_id for reservations
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_session ON reservations(session_id);
    `);

    console.log("Inventory database initialized");
  } catch (error) {
    console.error("Failed to initialize inventory database:", error);
    throw error;
  }
};
