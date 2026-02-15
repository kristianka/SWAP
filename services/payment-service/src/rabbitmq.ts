import amqplib from "amqplib";
import { QUEUES, EXCHANGES, ROUTING_KEYS } from "@swap/shared";

let channel: amqplib.Channel | null = null;

// Connect to RabbitMQ and assert necessary queues
export const connectToRabbitMQ = async (): Promise<amqplib.Channel> => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  // Assert all exchanges this service needs to interact with
  await channel.assertExchange(EXCHANGES.PAYMENT_EXCHANGE, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.INVENTORY_EXCHANGE, "topic", { durable: true });

  // Assert the queue this service consumes from
  await channel.assertQueue(QUEUES.INVENTORY_EVENTS, { durable: true });

  // Bind the queue to the exchanges it needs to listen to
  await channel.bindQueue(
    QUEUES.INVENTORY_EVENTS,
    EXCHANGES.INVENTORY_EXCHANGE,
    ROUTING_KEYS.INVENTORY_RESERVED,
  );

  console.log("Payment Service connected to RabbitMQ");

  return channel;
};

// Get the initialized RabbitMQ channel
export const getChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
