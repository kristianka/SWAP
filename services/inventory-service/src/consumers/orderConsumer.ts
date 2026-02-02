import type { Channel, ConsumeMessage } from "amqplib";
import type { OrderCreatedEvent, PaymentFailedEvent } from "../types";
import { ORDER_EVENTS } from "../constants";
import { handleOrderEvent } from "../handlers/orderEventHandler";

export const startOrderConsumer = (channel: Channel) => {
  channel.consume(ORDER_EVENTS, async (msg: ConsumeMessage | null) => {
    if (!msg) {
      return;
    }

    try {
      const event: OrderCreatedEvent | PaymentFailedEvent = JSON.parse(msg.content.toString());
      await handleOrderEvent(event);

      // Acknowledge the message after successful processing
      channel.ack(msg);
    } catch (error) {
      console.error("Error processing message:", error);
      // Reject and requeue the message if processing fails
      channel.nack(msg, false, true);
    }
  });

  console.log(`Listening for messages on ${ORDER_EVENTS} queue`);
};
