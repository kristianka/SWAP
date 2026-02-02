import Fastify from "fastify";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { registerOrderRoutes } from "./routes/orders";

const app = Fastify();

async function start() {
  try {
    const port = process.env.PORT || 3001;
    if (!port) {
      throw new Error("PORT environment variable is not set");
    }

    // Connect to RabbitMQ
    await connectToRabbitMQ();

    // Register routes
    await registerHealthRoutes(app);
    await registerOrderRoutes(app);

    // Start HTTP server
    await app.listen({ port: Number(port) });
    console.log(`🚀 Order Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Order Service:", error);
    process.exit(1);
  }
}

start();
