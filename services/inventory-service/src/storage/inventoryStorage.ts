import { pool } from "../db";
import type { OrderItem } from "@swap/shared";

export interface Product {
  id: string;
  name: string;
  stock_level: number;
  reserved: number;
  available: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ReservationResult {
  success: boolean;
  failedItems: { product: string; requested: number; available: number }[];
}

/**
 * Check if all items can be reserved (without actually reserving)
 */
export const checkAvailability = async (
  sessionId: string,
  items: OrderItem[],
): Promise<ReservationResult> => {
  const failedItems: ReservationResult["failedItems"] = [];

  // loop all items one by one
  for (const item of items) {
    const result = await pool.query<Product>(
      `SELECT id, available FROM products WHERE id = $1 AND session_id = $2`,
      [item.product, sessionId],
    );

    const product = result.rows[0];
    if (!product) {
      // Product doesn't exist
      failedItems.push({ product: item.product, requested: item.quantity, available: 0 });
    } else if (product.available < item.quantity) {
      // Not enough stock
      failedItems.push({
        product: item.product,
        requested: item.quantity,
        available: product.available,
      });
    }
  }

  return {
    success: failedItems.length === 0,
    failedItems,
  };
};

/**
 * Reserve inventory items for an order (uses optimistic locking)
 * Returns true if all items were successfully reserved
 */
export const reserveItems = async (
  sessionId: string,
  orderId: string,
  items: OrderItem[],
): Promise<ReservationResult> => {
  const client = await pool.connect();

  try {
    // use rollbacks for these transactions
    await client.query("BEGIN");

    const failedItems: ReservationResult["failedItems"] = [];

    for (const item of items) {
      // Try to reserve with optimistic locking
      const result = await client.query(
        `UPDATE products
         SET reserved = reserved + $1,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE
            id = $2 AND session_id = $3 AND (stock_level - reserved) >= $1
         RETURNING
            id, available`,
        [item.quantity, item.product, sessionId],
      );

      if (result.rowCount === 0) {
        // Failed to reserve - either product doesn't exist or insufficient stock
        const checkResult = await client.query<Product>(
          `SELECT
            id, available
          FROM
            products
          WHERE
            id = $1 AND session_id = $2
        `,
          [item.product, sessionId],
        );

        failedItems.push({
          product: item.product,
          requested: item.quantity,
          available: checkResult.rows[0]?.available ?? 0,
        });
      }
    }

    if (failedItems.length > 0) {
      // Rollback all reservations if any failed
      await client.query("ROLLBACK");
      return { success: false, failedItems };
    }

    // Store reservation record for later release if needed
    await client.query(
      `INSERT INTO reservations (order_id, session_id, items, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (order_id, session_id) DO NOTHING`,
      [orderId, sessionId, JSON.stringify(items)],
    );

    // commit at end
    await client.query("COMMIT");
    return { success: true, failedItems: [] };
  } catch (error) {
    // rollback if fails
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Release reserved inventory (compensating transaction for saga)
 */
export const releaseItems = async (sessionId: string, orderId: string): Promise<boolean> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the reservation
    const reservationResult = await client.query(
      `SELECT items FROM reservations WHERE order_id = $1 AND session_id = $2`,
      [orderId, sessionId],
    );

    if (reservationResult.rows.length === 0) {
      console.log(`No reservation found for order ${orderId}`);
      await client.query("COMMIT");
      return false;
    }

    const items = reservationResult.rows[0].items as OrderItem[];

    // Release each item
    for (const item of items) {
      await client.query(
        `UPDATE products
         SET reserved = GREATEST(0, reserved - $1),
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $2 AND session_id = $3`,
        [item.quantity, item.product, sessionId],
      );
    }

    // Delete the reservation record
    await client.query(`DELETE FROM reservations WHERE order_id = $1 AND session_id = $2`, [
      orderId,
      sessionId,
    ]);

    await client.query("COMMIT");
    console.log(`✅ Released inventory for order ${orderId}`);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Confirm reservation (move from reserved to sold) - called when payment succeeds
 */
export const confirmReservation = async (sessionId: string, orderId: string): Promise<boolean> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the reservation
    const reservationResult = await client.query(
      `SELECT items FROM reservations WHERE order_id = $1 AND session_id = $2`,
      [orderId, sessionId],
    );

    if (reservationResult.rows.length === 0) {
      console.log(`No reservation found for order ${orderId}`);
      await client.query("COMMIT");
      return false;
    }

    const items = reservationResult.rows[0].items as OrderItem[];

    // Deduct from both stock_level and reserved (item is sold)
    for (const item of items) {
      await client.query(
        `UPDATE products
         SET stock_level = stock_level - $1,
             reserved = reserved - $1,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $2 AND session_id = $3`,
        [item.quantity, item.product, sessionId],
      );
    }

    // Mark reservation as confirmed
    await client.query(
      `UPDATE reservations SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE order_id = $1 AND session_id = $2`,
      [orderId, sessionId],
    );

    await client.query("COMMIT");
    console.log(`✅ Confirmed reservation for order ${orderId}`);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all products with their stock levels
 */
export const getAllProducts = async (sessionId: string) => {
  const result = await pool.query<Product>(
    `
    SELECT
        * 
    FROM
        products
    WHERE
        session_id = $1
    ORDER BY
        name ASC
    `,
    [sessionId],
  );
  return result.rows;
};

/**
 * Seed initial product data (for testing/demo purposes)
 */
export const seedProducts = async (sessionId: string) => {
  const products = [
    { id: "laptop", name: "Gaming Laptop", stock_level: 5 },
    { id: "mouse", name: "Wireless Mouse", stock_level: 67 },
    { id: "keyboard", name: "Mechanical Keyboard", stock_level: 21 },
    { id: "monitor", name: "4K Monitor", stock_level: 15 },
  ];

  for (const product of products) {
    await pool.query(
      `INSERT INTO products (id, session_id, name, stock_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id, session_id) DO UPDATE SET
         stock_level = EXCLUDED.stock_level,
         updated_at = CURRENT_TIMESTAMP`,
      [product.id, sessionId, product.name, product.stock_level],
    );
  }

  return getAllProducts(sessionId);
};

/**
 * Get inventory statistics
 */
export const getInventoryStats = async (sessionId: string) => {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) as total_products,
      SUM(stock_level) as total_stock,
      SUM(reserved) as total_reserved,
      SUM(stock_level - reserved) as total_available
    FROM products
    WHERE session_id = $1
  `,
    [sessionId],
  );

  const reservationsResult = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending_reservations,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_reservations,
      COUNT(*) as total_reservations
    FROM reservations
    WHERE session_id = $1
  `,
    [sessionId],
  );

  return {
    products: result.rows[0],
    reservations: reservationsResult.rows[0],
  };
};

/**
 * Reset inventory to initial state (for testing)
 * Clears all reservations and reseeds products
 */
export const resetInventory = async (sessionId: string): Promise<Product[]> => {
  // Clear all reservations
  await pool.query(`DELETE FROM reservations WHERE session_id = $1`, [sessionId]);

  // Clear all processed events (idempotency keys)
  await pool.query(`DELETE FROM processed_events`);

  // Reset products - delete all and reseed
  await pool.query(`DELETE FROM products WHERE session_id = $1`, [sessionId]);

  // Seed fresh data
  return seedProducts(sessionId);
};
