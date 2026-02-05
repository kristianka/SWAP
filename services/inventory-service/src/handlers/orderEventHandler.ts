import type { OrderCreatedEvent, PaymentFailedEvent, InventoryReservedEvent } from "@swap/shared";
import { OrderEventType, PaymentEventType, InventoryEventType, QUEUES } from "@swap/shared";
import { getChannel } from "../rabbitmq";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";

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
  const orderId = event.data.id;
  const idempotencyKey = `inventory:reserve:${orderId}`;

  // Idempotency check, skip if already processed
  if (hasProcessed(idempotencyKey)) {
    console.log(`⏭️ Skipping duplicate ORDER_CREATED for order ${orderId}`);
    return true;
  }

  console.log(`Checking inventory for order ${orderId}`);
  // TODO: Check inventory, reserve items, etc.
  // Business logic here

  // For now, assume all items are available
  console.log(`✅ Inventory available, reserving items for order ${orderId}`);

  // artificial delay to simulate processing
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Publish INVENTORY_RESERVED event
  const inventoryEvent: InventoryReservedEvent = {
    type: InventoryEventType.INVENTORY_RESERVED,
    data: {
      orderId,
      items: event.data.items,
    },
  };

  const channel = getChannel();
  channel.sendToQueue(QUEUES.INVENTORY_EVENTS, Buffer.from(JSON.stringify(inventoryEvent)));

  console.log(`Published ${InventoryEventType.INVENTORY_RESERVED} for order ${orderId}`);

  // Mark as processed after successful handling
  markProcessed(idempotencyKey);

  return true;
};

const handlePaymentFailed = async (event: PaymentFailedEvent) => {
  const orderId = event.data.orderId;
  const idempotencyKey = `inventory:release:${orderId}`;

  // Idempotency check - skip if already processed
  if (hasProcessed(idempotencyKey)) {
    console.log(`⏭️ Skipping duplicate PAYMENT_FAILED for order ${orderId}`);
    return true;
  }

  console.log(`Releasing inventory for order ${orderId}`);
  // TODO: Release reserved inventory items
  // Business logic here

  // Mark as processed
  markProcessed(idempotencyKey);

  return true;
};
