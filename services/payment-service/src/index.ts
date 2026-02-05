import Fastify from "fastify";
import { connectToRabbitMQ } from "./rabbitmq";
import { registerHealthRoutes } from "./routes/health";
import { startPaymentConsumer } from "./consumers/paymentConsumer";

const app = Fastify();

// Payment service listens to payment requests and processes payments.
// When a payment request is received, it processes the payment and publishes payment events.

async function start() {
  try {
    const port = process.env.PORT || 3003;

    // Connect to RabbitMQ
    const channel = await connectToRabbitMQ();

    // Start consuming payment requests
    await startPaymentConsumer(channel);

    // Register routes
    await registerHealthRoutes(app);

    // Start HTTP server
    await app.listen({ port: Number(port) });
    console.log(`🚀 Payment Service running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start Payment Service:", error);
    process.exit(1);
  }
}

start();
