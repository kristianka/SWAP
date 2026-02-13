import type { FastifyInstance } from "fastify";
import {
  getAllProducts,
  seedProducts,
  getInventoryStats,
  resetInventory,
} from "../storage/inventoryStorage";

export async function registerInventoryRoutes(app: FastifyInstance) {
  // Get all products with stock levels
  app.get("/inventory", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    return getAllProducts(sessionId);
  });

  // Seed initial product data (for testing/demo)
  app.post("/inventory/seed", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    const products = await seedProducts(sessionId);
    return { message: "Inventory seeded successfully", products };
  });

  // Reset inventory to initial state (for testing)
  app.post("/inventory/reset", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    const products = await resetInventory(sessionId);
    return { message: "Inventory reset successfully", products };
  });

  // Get inventory statistics
  app.get("/inventory/stats", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    return getInventoryStats(sessionId);
  });
}
