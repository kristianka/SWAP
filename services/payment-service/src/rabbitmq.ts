import amqplib from "amqplib";
import { INVENTORY_EVENTS, PAYMENT_EVENTS } from "./constants";

let channel: amqplib.Channel | null = null;

// Connect to RabbitMQ and assert necessary queues
export const connectToRabbitMQ = async (): Promise<amqplib.Channel> => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  await channel.assertQueue(INVENTORY_EVENTS);
  await channel.assertQueue(PAYMENT_EVENTS);

  console.log("✅ Connected to RabbitMQ with queues:", INVENTORY_EVENTS, PAYMENT_EVENTS);

  return channel;
};

// Get the initialized RabbitMQ channel
export const getChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
