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

## Running

See individual service folders for instructions.

## Notes

- Types are shared via `@swap/shared` package
- Monorepo structure for ease of development
- All services use idempotency keys for message deduplication
