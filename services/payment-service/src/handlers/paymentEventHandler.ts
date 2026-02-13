import type { InventoryReservedEvent, PaymentSuccessEvent, PaymentFailedEvent } from "@swap/shared";
import { PaymentEventType, PaymentStatus, QUEUES } from "@swap/shared";
import { getChannel } from "../rabbitmq";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";
import { addPayment, updatePaymentStatus } from "../storage/paymentStorage";

export const handleInventoryReserved = async (event: InventoryReservedEvent) => {
  const { orderId, items, paymentBehaviour } = event.data;
  const sagaId = event.correlationId;
  const sessionId = event.sessionId;
  const idempotencyKey = `payment:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

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

  // Simulate payment processing (increased for demo effect)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Determine if we should fail based on payment behaviour
    let shouldFail = false;
    if (paymentBehaviour === "failure") {
      shouldFail = true;
    } else if (paymentBehaviour === "random") {
      shouldFail = Math.random() < 0.5; // 50% chance to fail
    }

    if (shouldFail) {
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

    // Publish to order service (for order completion)
    channel.sendToQueue(QUEUES.PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentEvent)));

    // Publish to inventory service (for reservation confirmation) - separate queue to avoid competing consumers
    channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(paymentEvent)));

    console.log(
      `[saga:${sagaId}] Published ${PaymentEventType.PAYMENT_SUCCESS} for order ${orderId}`,
    );

    // Mark as processed after successful handling
    await markProcessed(idempotencyKey);
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

    // Publish to order service (for order cancellation)
    channel.sendToQueue(QUEUES.PAYMENT_EVENTS, Buffer.from(JSON.stringify(paymentFailedEvent)));

    // Publish to inventory service (for reservation release) - separate queue to avoid competing consumers
    channel.sendToQueue(QUEUES.ORDER_EVENTS, Buffer.from(JSON.stringify(paymentFailedEvent)));

    console.log(
      `[saga:${sagaId}] Published ${PaymentEventType.PAYMENT_FAILED} for order ${orderId}`,
    );

    // Mark as processed even on failure to prevent retry loops
    await markProcessed(idempotencyKey);
  }
};
