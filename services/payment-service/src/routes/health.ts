import type { FastifyInstance } from "fastify";
import { PAYMENT_SERVICE } from "@swap/shared";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => {
    return { status: "ok", service: PAYMENT_SERVICE };
  });
};
