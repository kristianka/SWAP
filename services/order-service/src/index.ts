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
app.post("/orders", async (req) => {
  const body = req.body as { items: OrderItem[] };

  const order: Order = {
    id: Date.now().toString(),
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
  // Connect to RabbitMQ
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();
  await channel.assertQueue(ORDER_EVENTS);

  console.log("✅ Connected to RabbitMQ");

  // Start HTTP server
  await app.listen({ port: 3001 });
  console.log("🚀 Order Service running on http://localhost:3001");
}

start();
