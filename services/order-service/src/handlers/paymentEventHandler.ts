import type { PaymentSuccessEvent, PaymentFailedEvent, InventoryFailedEvent } from "@swap/shared";
import { PaymentEventType, InventoryEventType, OrderStatus } from "@swap/shared";
import { updateOrderStatus } from "../storage/orderStorage";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";

type OrderUpdateEvent = PaymentSuccessEvent | PaymentFailedEvent | InventoryFailedEvent;

/**
 * Handles events that affect order status:
 * - PAYMENT_SUCCESS: order completed
 * - PAYMENT_FAILED: order cancelled (triggers inventory release)
 * - INVENTORY_FAILED: order cancelled (no payment attempted)
 */
export const handlePaymentEvent = async (event: OrderUpdateEvent) => {
  const orderId = event.data.orderId;
  const idempotencyKey = `order-update:${orderId}:${event.type}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check - skip if already processed
  if (processed) {
    console.log(`⏭️ Skipping duplicate event for order ${orderId}`);
    return;
  }

  console.log(`Received event: ${event.type}`, event.data);

  switch (event.type) {
    case PaymentEventType.PAYMENT_SUCCESS:
      await handlePaymentSuccess(event);
      break;
    case PaymentEventType.PAYMENT_FAILED:
      await handlePaymentFailed(event);
      break;
    case InventoryEventType.INVENTORY_FAILED:
      await handleInventoryFailed(event);
      break;
    default:
      console.warn(`Unknown event type: ${event}`);
      return; // Don't mark as processed for unknown events
  }

  // Mark as processed after successful handling
  await markProcessed(idempotencyKey);
};

const handlePaymentSuccess = async (event: PaymentSuccessEvent) => {
  const { orderId, amount, transactionId } = event.data;
  console.log(`Payment successful for order ${orderId}: $${amount} (${transactionId})`);

  // Update order status to COMPLETED
  const updated = await updateOrderStatus(orderId, OrderStatus.COMPLETED);

  if (updated) {
    console.log(`Order ${orderId} completed successfully!`);
  } else {
    console.error(`Failed to update order ${orderId} - order not found`);
  }
};

const handlePaymentFailed = async (event: PaymentFailedEvent) => {
  const { orderId, reason } = event.data;
  console.log(`Payment failed for order ${orderId}: ${reason}`);

  // Update order status to CANCELLED
  const updated = await updateOrderStatus(orderId, OrderStatus.CANCELLED);

  if (updated) {
    console.log(`Order ${orderId} cancelled due to payment failure`);
  } else {
    console.error(`Failed to cancel order ${orderId} - order not found`);
  }
};

const handleInventoryFailed = async (event: InventoryFailedEvent) => {
  const { orderId, reason } = event.data;
  console.log(`Inventory failed for order ${orderId}: ${reason}`);

  // Update order status to CANCELLED - no payment was attempted
  const updated = await updateOrderStatus(orderId, OrderStatus.CANCELLED);

  if (updated) {
    console.log(`Order ${orderId} cancelled due to inventory failure`);
  } else {
    console.error(`Failed to cancel order ${orderId} - order not found`);
  }
};
