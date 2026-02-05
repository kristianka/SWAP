import type { FastifyInstance } from "fastify";
import { ORDER_SERVICE } from "@swap/shared";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => {
    return { status: "ok", service: ORDER_SERVICE };
  });
};
