import Fastify from "fastify";
import amqplib from "amqplib";
import { OrderStatus, OrderEventType, ORDER_SERVICE, ORDER_EVENTS } from "./constants";
import type { Order, OrderItem, OrderEvent } from "./types";

const app = Fastify();
let channel: amqplib.Channel;

// currently in storage, later in postgres
const orders: Order[] = [];

// Health check
app.get("/health", async () => {
  return { status: "ok", service: ORDER_SERVICE };
});

// Get all orders
app.get("/orders", async () => {
  return orders;
});

// Create order
app.post("/orders", async (req, reply) => {
  const body = req.body as { items: OrderItem[] };

  // todo add more and proper validation, like sanitize inputs
  if (!body.items || body.items.length === 0) {
    return reply.status(400).send({ error: "Order must contain at least one item." });
  }

  const order: Order = {
    id: Bun.randomUUIDv7(),
    items: body.items,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
  };

  orders.push(order);

  // Publish event to RabbitMQ
  const event: OrderEvent = {
    type: OrderEventType.ORDER_CREATED,
    data: order,
  };

  channel.sendToQueue(ORDER_EVENTS, Buffer.from(JSON.stringify(event)));

  console.log(`Published ${OrderEventType.ORDER_CREATED} for order ${order.id}`);

  return order;
});

async function start() {
  try {
    // Connect to RabbitMQ
    const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
    const connection = await amqplib.connect(rabbitMqURL);
    channel = await connection.createChannel();
    const res = await channel.assertQueue(ORDER_EVENTS);

    if (res.queue) {
      console.log(`✅ RabbitMQ queue '${res.queue}' is ready`);
    } else {
      throw new Error("Failed to assert RabbitMQ queue");
    }

    console.log("✅ Connected to RabbitMQ");

    // Start HTTP server
    await app.listen({ port: 3001 });
    console.log("🚀 Order Service running on http://localhost:3001");
  } catch (error) {
    console.error("Failed to start Order Service:", error);
    process.exit(1);
  }
}

start();
