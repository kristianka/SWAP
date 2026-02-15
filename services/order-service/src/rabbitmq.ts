import amqplib from "amqplib";
import { QUEUES, EXCHANGES, ROUTING_KEYS } from "@swap/shared";

let channel: amqplib.Channel | null = null;

// Connect to RabbitMQ and assert necessary queues
export const connectToRabbitMQ = async (): Promise<amqplib.Channel> => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  // Assert all exchanges this service needs to interact with
  await channel.assertExchange(EXCHANGES.ORDER_EXCHANGE, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.PAYMENT_EXCHANGE, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.INVENTORY_EXCHANGE, "topic", { durable: true });

  // Assert the queue this service consumes from
  await channel.assertQueue(QUEUES.PAYMENT_EVENTS, { durable: true });

  // Bind the queues to the exchanges it needs to listen to
  await channel.bindQueue(
    QUEUES.PAYMENT_EVENTS,
    EXCHANGES.PAYMENT_EXCHANGE,
    ROUTING_KEYS.PAYMENT_SUCCESS,
  );

  await channel.bindQueue(
    QUEUES.PAYMENT_EVENTS,
    EXCHANGES.PAYMENT_EXCHANGE,
    ROUTING_KEYS.PAYMENT_FAILED,
  );

  await channel.bindQueue(
    QUEUES.PAYMENT_EVENTS,
    EXCHANGES.INVENTORY_EXCHANGE,
    ROUTING_KEYS.INVENTORY_FAILED,
  );

  console.log("Order Service connected to RabbitMQ");

  return channel;
};

// Get the initialized RabbitMQ channel
export const getChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
