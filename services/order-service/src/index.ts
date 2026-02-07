import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { registerOrderRoutes } from "./routes/orders";
import { startPaymentConsumer } from "./consumers/paymentConsumer";
import { initDatabase } from "./db";
import { startOrderTimeoutMonitor } from "./orderTimeout";

const app = Fastify();

// Enable CORS
app.register(cors, { origin: true });

async function start() {
  try {
    const port = process.env.PORT || 3001;

    // Initialize database
    await initDatabase();

    // Connect to RabbitMQ
    const channel = await connectToRabbitMQ();

    // Start consuming events that affect order status
    // (PAYMENT_SUCCESS, PAYMENT_FAILED, INVENTORY_FAILED all come through PAYMENT_EVENTS)
    await startPaymentConsumer(channel);

    // Start timeout monitor to cancel stuck orders
    // could be a cron job in Docker, but for simplicity we run it here
    startOrderTimeoutMonitor();

    // Register routes
    await registerHealthRoutes(app);
    await registerOrderRoutes(app);

    // Start HTTP server
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    console.log(`🚀 Order Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Order Service:", error);
    process.exit(1);
  }
}

start();
