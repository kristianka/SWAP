import type { Channel, ConsumeMessage } from "amqplib";
import type { InventoryReservedEvent, InventoryFailedEvent } from "../types";
import { handleInventoryEvent } from "../handlers/inventoryEventHandler";
import { INVENTORY_EVENTS } from "../constants";

export const startInventoryConsumer = async (channel: Channel) => {
  await channel.assertQueue(INVENTORY_EVENTS);

  // Consume messages from INVENTORY_EVENTS queue
  channel.consume(INVENTORY_EVENTS, async (msg: ConsumeMessage | null) => {
    if (msg) {
      try {
        const event: InventoryReservedEvent | InventoryFailedEvent = JSON.parse(
          msg.content.toString(),
        );

        await handleInventoryEvent(event);
        channel.ack(msg);
      } catch (error) {
        console.error("Error processing inventory event:", error);
        channel.nack(msg, false, false);
      }
    }
  });

  console.log("📦 Listening for inventory events...");
};
