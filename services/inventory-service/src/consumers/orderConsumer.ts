import type { Channel, ConsumeMessage } from "amqplib";
import type { OrderCreatedEvent, PaymentFailedEvent } from "@swap/shared";
import { QUEUES } from "@swap/shared";
import { handleOrderEvent } from "../handlers/orderEventHandler";

export const startOrderConsumer = (channel: Channel) => {
  channel.consume(QUEUES.ORDER_EVENTS, async (msg: ConsumeMessage | null) => {
    if (!msg) {
      return;
    }

    try {
      const event: OrderCreatedEvent | PaymentFailedEvent = JSON.parse(msg.content.toString());
      await handleOrderEvent(event);

      // acknowledge the message after successful processing
      channel.ack(msg);
    } catch (error) {
      console.error("Error processing message:", error);

      // nack the message and requeue it for retry, unless it has been redelivered
      if (msg.fields.redelivered) {
        console.error("Message failed after retry, discarding:", msg.content.toString());
        channel.nack(msg, false, false);
      } else {
        console.log("Requeuing message for retry");
        channel.nack(msg, false, true);
      }
    }
  });

  console.log(`Listening for messages on ${QUEUES.ORDER_EVENTS} queue`);
};
