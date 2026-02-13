import amqplib from "amqplib";
import { assertAllQueues, assertAllExchanges, QUEUES, EXCHANGES } from "@swap/shared";

let channel: amqplib.Channel | null = null;

export const connectToRabbitMQ = async () => {
  const rabbitMqURL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  const connection = await amqplib.connect(rabbitMqURL);
  channel = await connection.createChannel();

  await assertAllExchanges(channel);
  await assertAllQueues(channel);
  await channel.bindQueue(QUEUES.ORDER_EVENTS, EXCHANGES.PAYMENT_EXCHANGE, "#");
  await channel.bindQueue(QUEUES.ORDER_EVENTS, EXCHANGES.ORDER_EXCHANGE, "#");

  console.log("Inventory Service connected to RabbitMQ");

  return channel;
};

export function getChannel(): amqplib.Channel {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
}
