import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { registerPaymentRoutes } from "./routes/payments";
import { startPaymentConsumer } from "./consumers/paymentConsumer";
import { initDatabase } from "./db";

const app = Fastify();

// Enable CORS
app.register(cors, { origin: true });

// Payment service listens to payment requests and processes payments.
// When a payment request is received, it processes the payment and publishes payment events.

async function start() {
  try {
    const port = process.env.PORT || 3003;

    // Initialize database
    await initDatabase();

    // Connect to RabbitMQ
    const channel = await connectToRabbitMQ();

    // Start consuming payment requests
    await startPaymentConsumer(channel);

    // Register routes
    await registerHealthRoutes(app);
    await registerPaymentRoutes(app);

    // Start HTTP server
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    console.log(`🚀 Payment Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Payment Service:", error);
    process.exit(1);
  }
}

start();
