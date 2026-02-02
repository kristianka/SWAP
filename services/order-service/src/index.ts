import Fastify from "fastify";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { registerOrderRoutes } from "./routes/orders";

const app = Fastify();

async function start() {
  try {
    // Connect to RabbitMQ
    await connectToRabbitMQ();

    // Register routes
    await registerHealthRoutes(app);
    await registerOrderRoutes(app);

    // Start HTTP server
    await app.listen({ port: 3001 });
    console.log("🚀 Order Service running on http://localhost:3001");
  } catch (error) {
    console.error("Failed to start Order Service:", error);
    process.exit(1);
  }
}

start();
