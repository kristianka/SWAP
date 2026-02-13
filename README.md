# SWAP

Software Architecture Project 2026 - University of Helsinki

## Architecture

Event-driven microservices architecture using **RabbitMQ** as the message broker.

### Services

- **Order Service** - Orchestrates order lifecycle and maintains order state
- **Inventory Service** - Manages inventory reservations and releases
- **Payment Service** - Processes payments and persists transaction records

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
        InventoryService->>InventoryService: Check & Reserve Inventory
        Note over InventoryService: 1.5s processing
        InventoryService->>RabbitMQ: INVENTORY_RESERVED → QUEUES.INVENTORY_EVENTS

        RabbitMQ->>PaymentService: Consume INVENTORY_RESERVED
        PaymentService->>PaymentService: Process Payment
        Note over PaymentService: 3s processing
        PaymentService->>RabbitMQ: PAYMENT_SUCCESS → QUEUES.PAYMENT_EVENTS

        RabbitMQ->>OrderService: Consume PAYMENT_SUCCESS
        OrderService->>OrderService: Update Order (COMPLETED)
        RabbitMQ->>InventoryService: Consume PAYMENT_SUCCESS
        InventoryService->>InventoryService: Confirm Reservation (deduct stock)

        Note over Client,PaymentService: Payment Failure Path (Compensating Transaction)

        PaymentService->>RabbitMQ: PAYMENT_FAILED → QUEUES.PAYMENT_EVENTS
        RabbitMQ->>OrderService: Consume PAYMENT_FAILED
        OrderService->>OrderService: Update Order (CANCELLED)
        RabbitMQ->>InventoryService: Consume PAYMENT_FAILED
        InventoryService->>InventoryService: Release Inventory (compensate)

        Note over Client,PaymentService: Inventory Failure Path

        RabbitMQ->>InventoryService: Consume ORDER_CREATED
        InventoryService->>InventoryService: Check Inventory (insufficient)
        InventoryService->>RabbitMQ: INVENTORY_FAILED → QUEUES.INVENTORY_EVENTS
        RabbitMQ->>OrderService: Consume INVENTORY_FAILED
        OrderService->>OrderService: Update Order (CANCELLED)
```

## Testing

This project has automated testing made with Bun, which are run automatically in Pull Requests, or manually by `bun run test`

### Happy path

Happy path (=successful) path is the scenario when everything goes fine: user creates an order, there's inventory and payment succeeds. See instructions in `services/order-service` how to run.

### Failure Scenarios

#### Payment Failure (with compensating transaction)

To test the payment failure flow, pass `failTransaction: true` in the order creation request:

```json
{
  "items": [
    {
      "product": "laptop",
      "quantity": 1
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
5. Inventory reservation is released (compensating transaction)

#### Inventory Failure

To test the inventory failure path, order a product that doesn't exist or request more than available:

```bash
# Non-existent product
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"product": "non-existent", "quantity": 1}]}'

# Excessive quantity
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"product": "laptop", "quantity": 999}]}'
```

When inventory check fails:

1. Order is created in PENDING status
2. Inventory check fails (product not found or insufficient stock)
3. INVENTORY_FAILED event is published
4. Order status is updated to CANCELLED
5. No payment is attempted

### Seed Inventory

Before testing, seed the inventory with initial stock:

```bash
curl -X POST http://localhost:3002/inventory/seed
```

## Running

See individual service folders for instructions.

## Notes

- Types are shared via `@swap/shared` package
- Monorepo structure for ease of development
- All services use idempotency keys for message deduplication
