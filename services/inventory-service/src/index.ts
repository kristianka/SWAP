import Fastify from "fastify";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { startOrderConsumer } from "./consumers/orderConsumer";

const app = Fastify();

async function start() {
  try {
    const port = process.env.PORT || 3002;

    // Connect to RabbitMQ
    const channel = await connectToRabbitMQ();

    // Register routes
    await registerHealthRoutes(app);

    // Start consumers
    startOrderConsumer(channel);

    // Start HTTP server
    await app.listen({ port: Number(port) });
    console.log(`🚀 Inventory Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Inventory Service:", error);
    process.exit(1);
  }
}

start();
