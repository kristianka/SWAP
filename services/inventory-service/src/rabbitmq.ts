import amqplib from "amqplib";
import { ORDER_EVENTS, INVENTORY_EVENTS } from "./constants";

let channel: amqplib.Channel | null = null;

export const connectToRabbitMQ = async () => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  // Assert queues
  await channel.assertQueue(INVENTORY_EVENTS);
  await channel.assertQueue(ORDER_EVENTS);

  console.log("✅ Connected to RabbitMQ");

  return channel;
};

export function getChannel(): amqplib.Channel {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
}
