import type { FastifyRequest, FastifyReply } from "fastify";
import type { OrderItem, Order, OrderEvent } from "@swap/shared";
import { OrderStatus, OrderEventType, QUEUES } from "@swap/shared";
import { addOrder } from "../storage/orderStorage";
import { getChannel } from "../rabbitmq";

interface CreateOrderBody {
  items: OrderItem[];
  failTransaction?: boolean;
}

export const createOrderHandler = async (
  req: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply,
) => {
  const { items, failTransaction } = req.body;

  // TODO: Add more and proper validation, like sanitize inputs
  if (!items || items.length === 0) {
    reply.status(400);
    throw new Error("Order must contain at least one item.");
  }

  const order: Order = {
    id: Bun.randomUUIDv7(),
    items,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
    failTransaction,
  };

  await addOrder(order);

  // Publish event to RabbitMQ
  const event: OrderEvent = {
    type: OrderEventType.ORDER_CREATED,
    data: order,
  };

  const channel = getChannel();
  channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(event)));

  console.log(`Published ${OrderEventType.ORDER_CREATED} for order ${order.id}`);

  return order;
};
