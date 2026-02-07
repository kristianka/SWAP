import type { FastifyInstance } from "fastify";
import { ORDER_SERVICE, checkQueueHealth } from "@swap/shared";
import { getChannel } from "../rabbitmq";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => {
    return { status: "ok", service: ORDER_SERVICE };
  });

  app.get("/health/queues", async () => {
    try {
      const channel = getChannel();
      const queueHealth = await checkQueueHealth(channel);
      return {
        status: "ok",
        service: ORDER_SERVICE,
        queues: queueHealth,
      };
    } catch (error) {
      return {
        status: "error",
        service: ORDER_SERVICE,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
};
