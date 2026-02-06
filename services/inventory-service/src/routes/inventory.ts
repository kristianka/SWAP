import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory", async (request, reply) => {
    const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    return result.rows;
  });
}
