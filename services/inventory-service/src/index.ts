import Fastify from "fastify";
import amqplib from "amqplib";
import { INVENTORY_EVENTS, INVENTORY_SERVICE } from "./constants";

const app = Fastify();
let channel: amqplib.Channel;

// currently in storage, later in postgres
const orders = [];

// Health check
app.get("/health", async () => {
  return { status: "ok", service: INVENTORY_SERVICE };
});

async function start() {
  try {
    // Connect to RabbitMQ
    const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
    const connection = await amqplib.connect(rabbitMqURL);
    channel = await connection.createChannel();
    const res = await channel.assertQueue(INVENTORY_EVENTS);

    if (res.queue) {
      console.log(`✅ RabbitMQ queue '${res.queue}' is ready`);
    } else {
      throw new Error("Failed to assert RabbitMQ queue");
    }

    console.log("✅ Connected to RabbitMQ");

    // Start HTTP server
    await app.listen({ port: 3001 });
    console.log("🚀 Inventory Service running on http://localhost:3001");
  } catch (error) {
    console.error("Failed to start Inventory Service:", error);
    process.exit(1);
  }
}

start();
