import type { Channel, ConsumeMessage } from "amqplib";
import type { PaymentRequestEvent } from "../types";
import { handlePaymentRequest } from "../handlers/paymentEventHandler";
import { PAYMENT_QUEUE } from "../constants";

export const startPaymentConsumer = async (channel: Channel) => {
  await channel.assertQueue(PAYMENT_QUEUE);

  // Consume messages from PAYMENT_QUEUE
  channel.consume(PAYMENT_QUEUE, async (msg: ConsumeMessage | null) => {
    if (msg) {
      try {
        const event: PaymentRequestEvent = JSON.parse(msg.content.toString());

        await handlePaymentRequest(event);
        channel.ack(msg);
      } catch (error) {
        console.error("Error processing payment request:", error);

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

  console.log("Payment Service listening for payment requests...");
};
