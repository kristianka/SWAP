import type { OrderCreatedEvent, PaymentFailedEvent } from "../types";
import { OrderEventType, PaymentEventType } from "../constants";

export const handleOrderEvent = async (event: OrderCreatedEvent | PaymentFailedEvent) => {
  console.log(`📦 Received event: ${event.type}`, event.data);

  // basic event routing, todo make more elegant
  switch (event.type) {
    case OrderEventType.ORDER_CREATED:
      await handleOrderCreated(event);
      break;
    case PaymentEventType.PAYMENT_FAILED:
      await handlePaymentFailed(event);
      break;
    default:
      console.warn(`Unknown event type: ${(event as any).type}`);
  }
};

const handleOrderCreated = async (event: OrderCreatedEvent) => {
  console.log(`Checking inventory for order ${event.data.id}`);
  // TODO: Check inventory, reserve items, etc.
  // Business logic here
};

const handlePaymentFailed = async (event: PaymentFailedEvent) => {
  console.log(`Releasing inventory for order ${event.data.orderId}`);
  // TODO: Release reserved inventory items
  // Business logic here
};
