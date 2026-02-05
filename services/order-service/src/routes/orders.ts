import type { FastifyInstance } from "fastify";
import { getOrders, getOrderById } from "../storage/orderStorage";
import { createOrderHandler } from "../handlers/orderHandler";

export const registerOrderRoutes = (app: FastifyInstance) => {
  // Get all orders
  app.get("/orders", async () => {
    return getOrders();
  });

  // Get order by ID
  app.get("/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = getOrderById(id);

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
