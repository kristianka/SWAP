import type { InventoryReservedEvent, InventoryFailedEvent } from "../types";
import { InventoryEventType, OrderStatus } from "../constants";
import { updateOrderStatus } from "../storage/orderStorage";

export const handleInventoryEvent = async (
  event: InventoryReservedEvent | InventoryFailedEvent,
) => {
  console.log(`📦 Received inventory event: ${event.type}`, event.data);

  // todo make more elegant
  switch (event.type) {
    case InventoryEventType.INVENTORY_RESERVED:
      await handleInventoryReserved(event);
      break;
    case InventoryEventType.INVENTORY_FAILED:
      await handleInventoryFailed(event);
      break;
    default:
      console.warn(`Unknown inventory event type: ${event}`);
  }
};

const handleInventoryReserved = async (event: InventoryReservedEvent) => {
  const { orderId } = event.data;
  console.log(`✅ Inventory reserved for order ${orderId}`);

  // Update order status to PROCESSING
  updateOrderStatus(orderId, OrderStatus.PROCESSING);
  console.log(`Updated order ${orderId} status to PROCESSING`);

  // TODO: Next step would be to publish to payment service
};

const handleInventoryFailed = async (event: InventoryFailedEvent) => {
  const { orderId, reason } = event.data;
  console.log(`❌ Inventory failed for order ${orderId}: ${reason}`);

  // Update order status to CANCELLED
  updateOrderStatus(orderId, OrderStatus.CANCELLED);
  console.log(`Updated order ${orderId} status to CANCELLED`);
};
