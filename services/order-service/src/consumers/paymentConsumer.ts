import type { Channel, ConsumeMessage } from "amqplib";
import type { PaymentSuccessEvent, PaymentFailedEvent, InventoryFailedEvent } from "@swap/shared";
import { QUEUES } from "@swap/shared";
import { handlePaymentEvent } from "../handlers/paymentEventHandler";

type OrderUpdateEvent = PaymentSuccessEvent | PaymentFailedEvent | InventoryFailedEvent;

/**
 * Consumes events from PAYMENT_EVENTS queue that affect order status:
 * - PAYMENT_SUCCESS (from payment-service)
 * - PAYMENT_FAILED (from payment-service)
 * - INVENTORY_FAILED (from inventory-service)
 */
export const startPaymentConsumer = async (channel: Channel) => {
  await channel.assertQueue(QUEUES.PAYMENT_EVENTS);

  channel.consume(QUEUES.PAYMENT_EVENTS, async (msg: ConsumeMessage | null) => {
    if (msg) {
      try {
        const event: OrderUpdateEvent = JSON.parse(msg.content.toString());

        await handlePaymentEvent(event);
        channel.ack(msg);
      } catch (error) {
        console.error("Error processing payment event:", error);

        // nack the message and requeue it for retry, unless it has been redelivered
        if (msg.fields.redelivered) {
          console.error("Message failed after retry, discarding:", msg.content.toString());
          channel.nack(msg, false, false);
        } else {
          console.log("Requeuing message for retry");
          channel.nack(msg, false, true);
        }
      }
    }
  });

  console.log("Listening for payment events...");
};
