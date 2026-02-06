# SWAP

Software Architecture Project 2026 - University of Helsinki

## Architecture

Event-driven microservices architecture using **RabbitMQ** as the message broker.

### Services

- **Order Service** - Orchestrates order lifecycle and maintains order state
- **Inventory Service** - Manages inventory reservations and releases
- **Payment Service** - Processes payments and handles transactions

### RabbitMQ Queues

| Queue              | Constant                  | Events                                                                |
| ------------------ | ------------------------- | --------------------------------------------------------------------- |
| `order-events`     | `QUEUES.ORDER_EVENTS`     | `OrderEventType.ORDER_CREATED`                                        |
| `inventory-events` | `QUEUES.INVENTORY_EVENTS` | `InventoryEventType.INVENTORY_RESERVED`                               |
| `payment-events`   | `QUEUES.PAYMENT_EVENTS`   | `PaymentEventType.PAYMENT_SUCCESS`, `PaymentEventType.PAYMENT_FAILED` |

## Flow

```mermaid
    sequenceDiagram
        participant Client
        participant OrderService as Order Service
        participant RabbitMQ
        participant InventoryService as Inventory Service
        participant PaymentService as Payment Service

        Note over Client,PaymentService: Happy Path

        Client->>OrderService: POST /orders
        OrderService->>OrderService: Create Order (PENDING)
        OrderService->>RabbitMQ: ORDER_CREATED → QUEUES.ORDER_EVENTS
        OrderService-->>Client: 200 OK

        RabbitMQ->>InventoryService: Consume ORDER_CREATED
        InventoryService->>InventoryService: Reserve Inventory
        Note over InventoryService: 2.5s processing
        InventoryService->>RabbitMQ: INVENTORY_RESERVED → QUEUES.INVENTORY_EVENTS

        RabbitMQ->>PaymentService: Consume INVENTORY_RESERVED
        PaymentService->>PaymentService: Process Payment
        Note over PaymentService: 3s processing
        PaymentService->>RabbitMQ: PAYMENT_SUCCESS → QUEUES.PAYMENT_EVENTS

        RabbitMQ->>OrderService: Consume PAYMENT_SUCCESS
        OrderService->>OrderService: Update Order (COMPLETED)

        Note over Client,PaymentService: Failure Path

        PaymentService->>RabbitMQ: PAYMENT_FAILED → QUEUES.PAYMENT_EVENTS
        RabbitMQ->>OrderService: Consume PAYMENT_FAILED
        OrderService->>OrderService: Update Order (CANCELLED)
        RabbitMQ->>InventoryService: Consume PAYMENT_FAILED
        InventoryService->>InventoryService: Release Inventory
```

## Testing

This project has automated testing made with Bun, which are run automatically in Pull Requests, or manually by `bun run test`

### Happy path

Happy path (=successful) path is the scenario when everything goes fine: user creates an order, there's inventory and payment succeeds. See instructions in `services/order-service` how to run.

### Failure Scenarios

To test the cancellation flow, pass `failTransaction: true` in the order creation request:

```json
{
  "items": [
    {
      "product": "Widget",
      "quantity": 2
    }
  ],
  "failTransaction": true
}
```

When this flag is set:

1. Order is created normally in PENDING status
2. Inventory is reserved successfully
3. Payment intentionally fails with "Transaction intentionally failed for testing purposes"
4. Order status is updated to CANCELLED
5. Inventory reservation is released

## Running

See individual service folders for instructions.

## Notes

- Types are shared via `@swap/shared` package
- Monorepo structure for ease of development
- All services use idempotency keys for message deduplication
