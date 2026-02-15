import type { Channel } from "amqplib";
import { QUEUES } from "./constants";

/**
 * Dead Letter Queue configuration
 * Messages that fail processing multiple times go here for manual inspection
 */
const DLQ_SUFFIX = ".dlq";

export interface QueueConfig {
  name: string;
  options?: {
    durable?: boolean;
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
    messageTtl?: number;
  };
}

/**
 * Centralized queue configuration to ensure consistency across all services
 * Each service should call this to set up all queues they interact with
 */
export const QUEUE_CONFIGS: QueueConfig[] = [
  {
    name: QUEUES.ORDER_EVENTS,
    options: {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: `${QUEUES.ORDER_EVENTS}${DLQ_SUFFIX}`,
    },
  },
  {
    name: QUEUES.INVENTORY_EVENTS,
    options: {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: `${QUEUES.INVENTORY_EVENTS}${DLQ_SUFFIX}`,
    },
  },
  {
    name: QUEUES.PAYMENT_EVENTS,
    options: {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: `${QUEUES.PAYMENT_EVENTS}${DLQ_SUFFIX}`,
    },
  },
  // Dead Letter Queues (no DLQ for DLQs to avoid infinite loops)
  {
    name: `${QUEUES.ORDER_EVENTS}${DLQ_SUFFIX}`,
    options: { durable: true },
  },
  {
    name: `${QUEUES.INVENTORY_EVENTS}${DLQ_SUFFIX}`,
    options: { durable: true },
  },
  {
    name: `${QUEUES.PAYMENT_EVENTS}${DLQ_SUFFIX}`,
    options: { durable: true },
  },
];

/**
 * Publish an event to an exchange
 * This is the choreography pattern - publisher doesn't know who consumes
 */
export const publishToExchange = (
  channel: Channel,
  exchange: string,
  routingKey: string,
  message: object,
): void => {
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};

/**
 * Verify queue connectivity and message counts
 * Useful for health checks
 */
export const checkQueueHealth = async (
  channel: Channel,
): Promise<{ [queueName: string]: { messageCount: number; consumerCount: number } }> => {
  const health: { [queueName: string]: { messageCount: number; consumerCount: number } } = {};

  for (const config of QUEUE_CONFIGS) {
    try {
      const queueInfo = await channel.checkQueue(config.name);
      health[config.name] = {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      };
    } catch (error) {
      console.error(`Failed to check queue ${config.name}:`, error);
      health[config.name] = {
        messageCount: -1,
        consumerCount: -1,
      };
    }
  }

  return health;
};
