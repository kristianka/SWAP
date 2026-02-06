import type { InventoryReservedEvent, PaymentSuccessEvent, PaymentFailedEvent } from "@swap/shared";
import { PaymentEventType, QUEUES } from "@swap/shared";
import { getChannel } from "../rabbitmq";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";

export const handleInventoryReserved = async (event: InventoryReservedEvent) => {
  const { orderId, items, failTransaction } = event.data;
  const idempotencyKey = `payment:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check, prevent duplicate payment processing
  if (processed) {
    console.log(`⏭️ Skipping duplicate payment request for order ${orderId}`);
    return;
  }

  console.log(`Processing payment for order ${orderId}...`);

  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Check if we should intentionally fail for testing
    if (failTransaction) {
      throw new Error("Transaction intentionally failed for testing purposes");
    }

    const channel = getChannel();
    // no real payment logic, just mock success
    const amount = items.reduce((sum, item) => sum + item.quantity * 10, 0); // Mock price calculation
    const transactionId = `txn_${Bun.randomUUIDv7()}`;

    console.log(`Payment successful for order ${orderId}: $${amount}`);

    // Publish PAYMENT_SUCCESS event
    const paymentEvent: PaymentSuccessEvent = {
      type: PaymentEventType.PAYMENT_SUCCESS,
      data: {
        orderId,
        amount,
        transactionId,
      },
    };

    // Publish to order service (for order completion)
    channel.sendToQueue(QUEUES.PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentEvent)));

    // Publish to inventory service (for reservation confirmation) - separate queue to avoid competing consumers
    channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(paymentEvent)));

    console.log(`Published ${PaymentEventType.PAYMENT_SUCCESS} for order ${orderId}`);

    // Mark as processed after successful handling
    await markProcessed(idempotencyKey);
  } catch (error) {
    console.error(`Payment failed for order ${orderId}!`, error);

    // Publish PAYMENT_FAILED event
    const paymentFailedEvent: PaymentFailedEvent = {
      type: PaymentEventType.PAYMENT_FAILED,
      data: {
        orderId,
        reason: error instanceof Error ? error.message : "Unknown payment error",
      },
    };

    const channel = getChannel();

    // Publish to order service (for order cancellation)
    channel.sendToQueue(QUEUES.PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentFailedEvent)));

    // Publish to inventory service (for reservation release) - separate queue to avoid competing consumers
    channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(paymentFailedEvent)));

    console.log(`Published ${PaymentEventType.PAYMENT_FAILED} for order ${orderId}`);

    // Mark as processed even on failure to prevent retry loops
    await markProcessed(idempotencyKey);
  }
};
