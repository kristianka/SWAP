import type { FastifyInstance } from "fastify";
import { getOrders } from "../storage/orderStorage";
import { createOrderHandler } from "../handlers/orderHandler";

export const registerOrderRoutes = (app: FastifyInstance) => {
  // Get all orders
  app.get("/orders", async () => {
    return getOrders();
  });

  // Create order
  app.post("/orders", createOrderHandler);
};
