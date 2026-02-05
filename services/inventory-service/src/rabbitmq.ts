import amqplib from "amqplib";
import { QUEUES } from "@swap/shared";

let channel: amqplib.Channel | null = null;

export const connectToRabbitMQ = async () => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  // Assert queues
  await channel.assertQueue(QUEUES.INVENTORY_EVENTS);
  await channel.assertQueue(QUEUES.ORDER_EVENTS);

  console.log("✅ Connected to RabbitMQ");

  return channel;
};

export function getChannel(): amqplib.Channel {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
}
