import type { OrderCreatedEvent, PaymentFailedEvent, InventoryReservedEvent } from "../types";
import {
  OrderEventType,
  PaymentEventType,
  InventoryEventType,
  INVENTORY_EVENTS,
} from "../constants";
import { getChannel } from "../rabbitmq";

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
      console.warn(`Unknown event type: ${event}`);
  }
};

const handleOrderCreated = async (event: OrderCreatedEvent) => {
  console.log(`Checking inventory for order ${event.data.id}`);
  // TODO: Check inventory, reserve items, etc.
  // Business logic here

  // For now, assume all items are available
  console.log(`✅ Inventory available, reserving items for order ${event.data.id}`);

  // artificial delay to simulate processing
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Publish INVENTORY_RESERVED event
  const inventoryEvent: InventoryReservedEvent = {
    type: InventoryEventType.INVENTORY_RESERVED,
    data: {
      orderId: event.data.id,
      items: event.data.items,
    },
  };

  const channel = getChannel();
  channel.sendToQueue(INVENTORY_EVENTS, Buffer.from(JSON.stringify(inventoryEvent)));

  console.log(`Published ${InventoryEventType.INVENTORY_RESERVED} for order ${event.data.id}`);

  return true;
};

const handlePaymentFailed = async (event: PaymentFailedEvent) => {
  console.log(`Releasing inventory for order ${event.data.orderId}`);
  // TODO: Release reserved inventory items
  // Business logic here
  return true;
};
