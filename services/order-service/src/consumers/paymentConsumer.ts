import type { Channel, ConsumeMessage } from "amqplib";
import type { PaymentSuccessEvent, PaymentFailedEvent } from "../types";
import { handlePaymentEvent } from "../handlers/paymentEventHandler";
import { PAYMENT_EVENTS } from "../constants";

export const startPaymentConsumer = async (channel: Channel) => {
  await channel.assertQueue(PAYMENT_EVENTS);

  // Consume messages from PAYMENT_EVENTS queue
  channel.consume(PAYMENT_EVENTS, async (msg: ConsumeMessage | null) => {
    if (msg) {
      try {
        const event: PaymentSuccessEvent | PaymentFailedEvent = JSON.parse(msg.content.toString());

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
