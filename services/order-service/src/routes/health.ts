import type { FastifyInstance } from "fastify";
import { ORDER_SERVICE } from "../constants";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => {
    return { status: "ok", service: ORDER_SERVICE };
  });
};
