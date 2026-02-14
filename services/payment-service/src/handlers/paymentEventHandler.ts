import type { InventoryReservedEvent, PaymentSuccessEvent, PaymentFailedEvent } from "@swap/shared";
import {
  PaymentEventType,
  PaymentStatus,
  EXCHANGES,
  ROUTING_KEYS,
  shouldFailForBehaviour,
  publishToExchange,
} from "@swap/shared";
import { getChannel } from "../rabbitmq";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";
import { addPayment, updatePaymentStatus } from "../storage/paymentStorage";

export const handleInventoryReserved = async (event: InventoryReservedEvent) => {
  const { orderId, items, paymentBehaviour } = event.data;
  const sagaId = event.correlationId;
  const sessionId = event.sessionId;
  const idempotencyKey = `payment:${orderId}`;
  const processed = await hasProcessed(sessionId, idempotencyKey);

  // Idempotency check, prevent duplicate payment processing
  if (processed) {
    console.log(`[saga:${sagaId}] Skipping duplicate payment request for order ${orderId}`);
    return;
  }

  console.log(`[saga:${sagaId}] Processing payment for order ${orderId}...`);

  // Calculate amount upfront for both success and failure cases
  const amount = items.reduce((sum, item) => sum + item.quantity * 10, 0); // Mock price calculation

  // Create payment record with PENDING status immediately for visual feedback
  const transactionId = `txn_${Bun.randomUUIDv7()}`;
  await addPayment(sessionId, {
    id: transactionId,
    order_id: orderId,
    amount,
    status: PaymentStatus.PENDING,
  });
  console.log(`[saga:${sagaId}] Payment created with PENDING status for order ${orderId}`);

  // Simulate payment processing (configurable delay for demo effect)
  const processingDelay = Number(process.env.PAYMENT_PROCESSING_DELAY_MS) || 5000; // Default: 5 seconds
  await new Promise((resolve) => setTimeout(resolve, processingDelay));

  try {
    // Determine if we should fail based on payment behaviour
    if (shouldFailForBehaviour(paymentBehaviour)) {
      throw new Error(
        "Transaction intentionally failed for testing purposes. Inventory released, order cancelled.",
      );
    }

    const channel = getChannel();
    // no real payment logic, just mock success
    // Update payment status to SUCCESS
    await updatePaymentStatus(sessionId, transactionId, PaymentStatus.SUCCESS);

    console.log(`[saga:${sagaId}] Payment successful for order ${orderId}: $${amount}`);

    // Publish PAYMENT_SUCCESS event
    const paymentEvent: PaymentSuccessEvent = {
      type: PaymentEventType.PAYMENT_SUCCESS,
      correlationId: sagaId,
      sessionId,
      timestamp: new Date().toISOString(),
      data: {
        orderId,
        amount,
        transactionId,
      },
    };

    publishToExchange(
      channel,
      EXCHANGES.PAYMENT_EXCHANGE,
      ROUTING_KEYS.PAYMENT_SUCCESS,
      paymentEvent,
    );

    console.log(
      `[saga:${sagaId}] Published ${PaymentEventType.PAYMENT_SUCCESS} for order ${orderId}`,
    );

    // Mark as processed after successful handling
    await markProcessed(sessionId, idempotencyKey);
  } catch (error) {
    console.error(`[saga:${sagaId}] Payment failed for order ${orderId}!`, error);

    // Update payment status to FAILED
    await updatePaymentStatus(sessionId, transactionId, PaymentStatus.FAILED);

    // Publish PAYMENT_FAILED event
    const paymentFailedEvent: PaymentFailedEvent = {
      type: PaymentEventType.PAYMENT_FAILED,
      correlationId: sagaId,
      sessionId,
      timestamp: new Date().toISOString(),
      data: {
        orderId,
        reason: error instanceof Error ? error.message : "Unknown payment error",
      },
    };

    const channel = getChannel();

    // Publish to payment exchange - both Order and Inventory services will receive it
    // This is the choreography pattern: publish once, consumers subscribe independently
    publishToExchange(
      channel,
      EXCHANGES.PAYMENT_EXCHANGE,
      ROUTING_KEYS.PAYMENT_FAILED,
      paymentFailedEvent,
    );

    console.log(
      `[saga:${sagaId}] Published ${PaymentEventType.PAYMENT_FAILED} for order ${orderId}`,
    );

    // Mark as processed even on failure to prevent retry loops
    await markProcessed(sessionId, idempotencyKey);
  }
};
