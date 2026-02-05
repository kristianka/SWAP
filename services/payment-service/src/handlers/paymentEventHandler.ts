import type {
  InventoryReservedEvent,
  InventoryFailedEvent,
  PaymentSuccessEvent,
  PaymentFailedEvent,
} from "../types";
import { InventoryEventType, PaymentEventType, PAYMENT_EVENTS } from "../constants";
import { getChannel } from "../rabbitmq";

export const handleInventoryEvent = async (
  event: InventoryReservedEvent | InventoryFailedEvent,
) => {
  console.log(`💳 Received inventory event: ${event.type}`, event.data);

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
  const { orderId, items } = event.data;
  console.log(`✅ Processing payment for order ${orderId}...`);

  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // no real payment logic, just mock success
    const amount = items.reduce((sum, item) => sum + item.quantity * 10, 0); // Mock price calculation
    const transactionId = `txn_${Bun.randomUUIDv7()}`;

    console.log(`💰 Payment successful for order ${orderId}: $${amount}`);

    // Publish PAYMENT_SUCCESS event
    const paymentEvent: PaymentSuccessEvent = {
      type: PaymentEventType.PAYMENT_SUCCESS,
      data: {
        orderId,
        amount,
        transactionId,
      },
    };

    const channel = getChannel();
    channel.sendToQueue(PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentEvent)));

    console.log(`Published ${PaymentEventType.PAYMENT_SUCCESS} for order ${orderId}`);
  } catch (error) {
    console.error(`❌ Payment failed for order ${orderId}:`, error);

    // Publish PAYMENT_FAILED event
    const paymentFailedEvent: PaymentFailedEvent = {
      type: PaymentEventType.PAYMENT_FAILED,
      data: {
        orderId,
        reason: error instanceof Error ? error.message : "Unknown payment error",
      },
    };

    const channel = getChannel();
    channel.sendToQueue(PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentFailedEvent)));

    console.log(`Published ${PaymentEventType.PAYMENT_FAILED} for order ${orderId}`);
  }
};

const handleInventoryFailed = async (event: InventoryFailedEvent) => {
  const { orderId, reason } = event.data;
  console.log(`❌ Inventory failed for order ${orderId}: ${reason}`);
  console.log(`⏭️  Skipping payment processing (no inventory available)`);

  // No need to process payment if inventory failed
  // The order service will handle the failure based on inventory event
};
