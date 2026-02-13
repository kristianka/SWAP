import type {
  OrderCreatedEvent,
  PaymentFailedEvent,
  PaymentSuccessEvent,
  InventoryReservedEvent,
  InventoryFailedEvent,
} from "@swap/shared";
import { OrderEventType, PaymentEventType, InventoryEventType, QUEUES } from "@swap/shared";
import { getChannel } from "../rabbitmq";
import { hasProcessed, markProcessed } from "../storage/idempotencyStorage";
import { reserveItems, releaseItems, confirmReservation } from "../storage/inventoryStorage";

export const handleOrderEvent = async (
  event: OrderCreatedEvent | PaymentFailedEvent | PaymentSuccessEvent,
) => {
  const sagaId = event.correlationId;
  console.log(`[saga:${sagaId}] Received event: ${event.type}`, event.data);

  switch (event.type) {
    case OrderEventType.ORDER_CREATED:
      await handleOrderCreated(event);
      break;
    case OrderEventType.ORDER_CANCELLED:
      await handleOrderCancelled(event);
      break;
    case PaymentEventType.PAYMENT_FAILED:
      await handlePaymentFailed(event);
      break;
    case PaymentEventType.PAYMENT_SUCCESS:
      await handlePaymentSuccess(event);
      break;
    default:
      console.warn(`Unknown event type: ${event}`);
  }
};

const handleOrderCreated = async (event: OrderCreatedEvent) => {
  const orderId = event.data.id;
  const sagaId = event.correlationId;
  const idempotencyKey = `inventory:reserve:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check, skip if already processed
  if (processed) {
    console.log(`[saga:${sagaId}] Skipping duplicate ORDER_CREATED for order ${orderId}`);
    return true;
  }

  console.log(`[saga:${sagaId}] Checking inventory for order ${orderId}...`);
  const items = event.data.items;

  // Artificial delay to simulate processing (makes the saga observable)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Attempt to reserve inventory
  const result = await reserveItems(orderId, items);
  const channel = getChannel();

  if (!result.success) {
    // Insufficient inventory - publish INVENTORY_FAILED to PAYMENT_EVENTS
    // (so it reaches order-service without competing with payment-service)
    console.log(
      `[saga:${sagaId}] Inventory reservation failed for order ${orderId}:`,
      result.failedItems,
    );

    const failedEvent: InventoryFailedEvent = {
      type: InventoryEventType.INVENTORY_FAILED,
      correlationId: sagaId,
      timestamp: new Date().toISOString(),
      data: {
        orderId,
        reason: `Insufficient stock: ${result.failedItems
          .map((f) => `${f.product} (requested: ${f.requested}, available: ${f.available})`)
          .join(", ")}`,
      },
    };

    // Route to PAYMENT_EVENTS queue (only order-service consumes this)
    channel.sendToQueue(QUEUES.PAYMENT_EVENTS, Buffer.from(JSON.stringify(failedEvent)));
    console.log(
      `[saga:${sagaId}] Published ${InventoryEventType.INVENTORY_FAILED} for order ${orderId}`,
    );

    await markProcessed(idempotencyKey);
    return false;
  }

  // Success - publish INVENTORY_RESERVED
  console.log(`[saga:${sagaId}] Inventory reserved for order ${orderId}`);

  const reservedEvent: InventoryReservedEvent = {
    type: InventoryEventType.INVENTORY_RESERVED,
    correlationId: sagaId,
    timestamp: new Date().toISOString(),
    data: {
      orderId,
      items,
      failTransaction: event.data.failTransaction,
    },
  };

  channel.sendToQueue(QUEUES.INVENTORY_EVENTS, Buffer.from(JSON.stringify(reservedEvent)));
  console.log(
    `[saga:${sagaId}] Published ${InventoryEventType.INVENTORY_RESERVED} for order ${orderId}`,
  );

  await markProcessed(idempotencyKey);
  return true;
};

const handleOrderCancelled = async (event: OrderCreatedEvent) => {
  const orderId = event.data.id;
  const sagaId = event.correlationId;
  const idempotencyKey = `inventory:release:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check: skip if already processed
  if (processed) {
    console.log(`[saga:${sagaId}] Skipping duplicate ORDER_CANCELLED for order ${orderId}`);
    return true;
  }

  console.log(
    `[saga:${sagaId}] Releasing inventory for order ${orderId} (order cancelled: ${event.data.errorMessage || "unknown reason"})`,
  );

  // Compensating transaction: release the reserved inventory
  const released = await releaseItems(orderId);

  if (released) {
    console.log(`[saga:${sagaId}] Inventory released for order ${orderId}`);
  } else {
    console.log(`[saga:${sagaId}] No reservation found to release for order ${orderId}`);
  }

  await markProcessed(idempotencyKey);
  return true;
};

const handlePaymentFailed = async (event: PaymentFailedEvent) => {
  const orderId = event.data.orderId;
  const sagaId = event.correlationId;
  const idempotencyKey = `inventory:release:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check: skip if already processed
  if (processed) {
    console.log(`[saga:${sagaId}] Skipping duplicate PAYMENT_FAILED for order ${orderId}`);
    return true;
  }

  console.log(
    `[saga:${sagaId}] Releasing inventory for order ${orderId} (payment failed: ${event.data.reason})`,
  );

  // Compensating transaction: release the reserved inventory
  const released = await releaseItems(orderId);

  if (released) {
    console.log(`[saga:${sagaId}] Inventory released for order ${orderId}`);
  } else {
    console.log(`[saga:${sagaId}] No reservation found to release for order ${orderId}`);
  }

  await markProcessed(idempotencyKey);
  return true;
};

const handlePaymentSuccess = async (event: PaymentSuccessEvent) => {
  const orderId = event.data.orderId;
  const sagaId = event.correlationId;
  const idempotencyKey = `inventory:confirm:${orderId}`;
  const processed = await hasProcessed(idempotencyKey);

  // Idempotency check: skip if already processed
  if (processed) {
    console.log(`[saga:${sagaId}] Skipping duplicate PAYMENT_SUCCESS for order ${orderId}`);
    return true;
  }

  console.log(`[saga:${sagaId}] Confirming inventory reservation for order ${orderId}`);

  // Confirm the reservation (deduct from actual stock)
  const confirmed = await confirmReservation(orderId);

  if (confirmed) {
    console.log(`[saga:${sagaId}] Inventory confirmed for order ${orderId}`);
  } else {
    console.log(`[saga:${sagaId}] No reservation found to confirm for order ${orderId}`);
  }

  await markProcessed(idempotencyKey);
  return true;
};
