import type { PaymentSuccessEvent, PaymentFailedEvent } from "@swap/shared";
import { PaymentEventType, OrderStatus } from "@swap/shared";
import { updateOrderStatus } from "../storage/orderStorage";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";

export const handlePaymentEvent = async (event: PaymentSuccessEvent | PaymentFailedEvent) => {
  const orderId = event.data.orderId;
  const idempotencyKey = `payment:${orderId}:${event.type}`;

  // Idempotency check - skip if already processed
  if (hasProcessed(idempotencyKey)) {
    console.log(`⏭️ Skipping duplicate payment event for order ${orderId}`);
    return;
  }

  console.log(`Received payment event: ${event.type}`, event.data);

  switch (event.type) {
    case PaymentEventType.PAYMENT_SUCCESS:
      await handlePaymentSuccess(event);
      break;
    case PaymentEventType.PAYMENT_FAILED:
      await handlePaymentFailed(event);
      break;
    default:
      console.warn(`Unknown payment event type: ${event}`);
      return; // Don't mark as processed for unknown events
  }

  // Mark as processed after successful handling
  markProcessed(idempotencyKey);
};

const handlePaymentSuccess = async (event: PaymentSuccessEvent) => {
  const { orderId, amount, transactionId } = event.data;
  console.log(`Payment successful for order ${orderId}: $${amount} (${transactionId})`);

  // Update order status to COMPLETED
  const updated = updateOrderStatus(orderId, OrderStatus.COMPLETED);

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
  const updated = updateOrderStatus(orderId, OrderStatus.CANCELLED);

  if (updated) {
    console.log(`Order ${orderId} cancelled due to payment failure`);
  } else {
    console.error(`Failed to cancel order ${orderId} - order not found`);
  }
};
