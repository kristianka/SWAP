import type { FastifyInstance } from "fastify";
import {
  getAllProducts,
  seedProducts,
  getInventoryStats,
  resetInventory,
} from "../storage/inventoryStorage";

export async function registerInventoryRoutes(app: FastifyInstance) {
  // Get all products with stock levels
  app.get("/inventory", async () => {
    return getAllProducts();
  });

  // Seed initial product data (for testing/demo)
  app.post("/inventory/seed", async () => {
    const products = await seedProducts();
    return { message: "Inventory seeded successfully", products };
  });

  // Reset inventory to initial state (for testing)
  app.post("/inventory/reset", async () => {
    const products = await resetInventory();
    return { message: "Inventory reset successfully", products };
  });

  // Get inventory statistics
  app.get("/inventory/stats", async () => {
    return getInventoryStats();
  });
}
