import { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/payments", async (request, reply) => {
    const result = await pool.query("SELECT * FROM payments ORDER BY created_at DESC");
    return result.rows;
  });
}
