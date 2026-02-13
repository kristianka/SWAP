import type { FastifyInstance } from "fastify";
import { getOrders, getOrderById, resetOrders } from "../storage/orderStorage";
import { createOrderHandler } from "../handlers/orderHandler";

export const registerOrderRoutes = (app: FastifyInstance) => {
  // Get all orders
  app.get("/orders", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    return await getOrders(sessionId);
  });

  // Reset orders (for testing)
  app.post("/orders/reset", async (req, reply) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    await resetOrders(sessionId);
    return { message: "Orders reset successfully" };
  });

  // Get order by ID
  app.get("/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    const order = await getOrderById(sessionId, id);

    // this wouldn't fly in real service since you can
    // get anyones order lol but for demo purposes it's fine
    if (!order) {
      reply.status(404);
      return { error: "Order not found" };
    }

    return order;
  });

  // Create order
  app.post("/orders", createOrderHandler);
};
