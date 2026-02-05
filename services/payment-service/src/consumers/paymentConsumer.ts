import type { Channel, ConsumeMessage } from "amqplib";
import type { InventoryReservedEvent } from "@swap/shared";
import { QUEUES } from "@swap/shared";
import { handleInventoryReserved } from "../handlers/paymentEventHandler";

export const startPaymentConsumer = async (channel: Channel) => {
  await channel.assertQueue(QUEUES.INVENTORY_EVENTS);

  // Consume messages from INVENTORY_EVENTS - react to inventory reservations
  channel.consume(QUEUES.INVENTORY_EVENTS, async (msg: ConsumeMessage | null) => {
    if (msg) {
      try {
        const event: InventoryReservedEvent = JSON.parse(msg.content.toString());

        await handleInventoryReserved(event);
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

  console.log("💳 Payment Service listening for inventory reservations...");
};
