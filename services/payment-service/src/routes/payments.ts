import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/payments", async (request, reply) => {
    const sessionId = request.headers["x-session-id"] as string;
    if (!sessionId) {
      reply.status(400);
      return { error: "Missing x-session-id header" };
    }
    const result = await pool.query(
      "SELECT * FROM payments WHERE session_id = $1 ORDER BY created_at DESC",
      [sessionId],
    );
    return result.rows;
  });
}
