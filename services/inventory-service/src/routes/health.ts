import type { FastifyInstance } from "fastify";
import { INVENTORY_SERVICE } from "@swap/shared";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => {
    return { status: "ok", service: INVENTORY_SERVICE };
  });
};
