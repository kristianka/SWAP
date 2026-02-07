import amqplib from "amqplib";
import { assertAllQueues } from "@swap/shared";

let channel: amqplib.Channel | null = null;

export const connectToRabbitMQ = async () => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  // Use centralized queue setup to ensure all queues exist with proper config
  await assertAllQueues(channel);

  console.log("Inventory Service connected to RabbitMQ");

  return channel;
};

export function getChannel(): amqplib.Channel {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
}
