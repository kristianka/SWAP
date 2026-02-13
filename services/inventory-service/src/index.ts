import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { registerInventoryRoutes } from "./routes/inventory";
import { startOrderConsumer } from "./consumers/orderConsumer";
import { initDatabase } from "./db";

const app = Fastify();

// Enable CORS
app.register(cors, { origin: true });

async function start() {
  try {
    const port = process.env.PORT || 3002;

    // Initialize database
    await initDatabase();

    // Connect to RabbitMQ
    const channel = await connectToRabbitMQ();

    // Register routes
    await registerHealthRoutes(app);
    await registerInventoryRoutes(app);

    // Start consumers
    startOrderConsumer(channel);

    // Start HTTP server
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    console.log(`🚀 Inventory Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Inventory Service:", error);
    process.exit(1);
  }
}

start();
