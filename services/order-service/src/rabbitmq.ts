import amqplib from "amqplib";
import { ORDER_EVENTS } from "./constants";

let channel: amqplib.Channel | null = null;

// Connect to RabbitMQ and assert necessary queues
export const connectToRabbitMQ = async (): Promise<amqplib.Channel> => {
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

  return channel;
};

// Get the initialized RabbitMQ channel
export const getChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
