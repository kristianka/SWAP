import type { FastifyRequest, FastifyReply } from "fastify";
import type { OrderItem, Order, OrderEvent } from "@swap/shared";
import {
  OrderStatus,
  OrderEventType,
  EXCHANGES,
  ROUTING_KEYS,
  publishToExchange,
} from "@swap/shared";
import { addOrder } from "../storage/orderStorage";
import { getChannel } from "../rabbitmq";

interface CreateOrderBody {
  items: OrderItem[];
  paymentBehaviour?: "success" | "failure" | "random";
  inventoryBehaviour?: "success" | "failure" | "random";
}

export const createOrderHandler = async (
  req: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply,
) => {
  const { items, paymentBehaviour, inventoryBehaviour } = req.body;
  const sessionId = req.headers["x-session-id"] as string;

  if (!sessionId) {
    reply.status(400);
    throw new Error("Missing x-session-id header");
  }

  // TODO: Add more and proper validation, like sanitize inputs
  if (!items || items.length === 0) {
    reply.status(400);
    throw new Error("Order must contain at least one item.");
  }

  const orderId = Bun.randomUUIDv7();
  const sagaId = Bun.randomUUIDv7(); // Unique saga ID for this transaction

  const order: Order = {
    id: orderId,
    sagaId,
    sessionId,
    items,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
    paymentBehaviour,
    inventoryBehaviour,
  };

  await addOrder(order);

  // Publish event to RabbitMQ with saga ID for end-to-end tracing
  const event: OrderEvent = {
    type: OrderEventType.ORDER_CREATED,
    correlationId: sagaId,
    sessionId,
    timestamp: new Date().toISOString(),
    data: order,
  };

  const channel = getChannel();
  publishToExchange(channel, EXCHANGES.ORDER_EXCHANGE, ROUTING_KEYS.ORDER_CREATED, event);

  console.log(`[saga:${sagaId}] Published ${OrderEventType.ORDER_CREATED} for order ${order.id}`);

  return order;
};
