import amqplib from "amqplib";
import { QUEUES } from "@swap/shared";

let channel: amqplib.Channel | null = null;

// Connect to RabbitMQ and assert necessary queues
export const connectToRabbitMQ = async (): Promise<amqplib.Channel> => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  await channel.assertQueue(QUEUES.INVENTORY_EVENTS); // Consumes from
  await channel.assertQueue(QUEUES.PAYMENT_EVENTS); // Publishes to (for order-service)
  await channel.assertQueue(QUEUES.ORDER_EVENTS); // Publishes to (for inventory-service)

  console.log("Connected to RabbitMQ");

  return channel;
};

// Get the initialized RabbitMQ channel
export const getChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
