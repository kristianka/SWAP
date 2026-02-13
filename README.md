# SWAP

Software Architecture Project 2026 - University of Helsinki

## Architecture

Event-driven microservices architecture using **RabbitMQ** for choreography-based saga pattern.

### Choreography vs Orchestration

This system implements **choreography** where:

- No central coordinator - each service autonomously decides when to act
- Services react to events and publish new events based on their domain logic
- Saga flow emerges from service interactions rather than being explicitly directed
- Each service knows its responsibility and reacts independently

This differs from **orchestration** where a central service would direct each step of the transaction.

**Trade-off:** The workflow is implicit (no single place to see the full flow) but services are fully decoupled and can evolve independently.

### Services

- **Order Service** - Manages order lifecycle and maintains order state
- **Inventory Service** - Manages inventory reservations and releases
- **Payment Service** - Processes payments and persists transaction records

### RabbitMQ Queues

| Queue              | Constant                  | Events                                                                                                       | Consumers                        |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `order-events`     | `QUEUES.ORDER_EVENTS`     | `OrderEventType.ORDER_CREATED`, `PaymentEventType.PAYMENT_SUCCESS`                                           | Inventory Service                |
| `inventory-events` | `QUEUES.INVENTORY_EVENTS` | `InventoryEventType.INVENTORY_RESERVED`, `InventoryEventType.INVENTORY_FAILED`                               | Payment Service                  |
| `payment-events`   | `QUEUES.PAYMENT_EVENTS`   | `PaymentEventType.PAYMENT_SUCCESS`, `PaymentEventType.PAYMENT_FAILED`, `InventoryEventType.INVENTORY_FAILED` | Order Service, Inventory Service |

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
        Note over InventoryService: 3s processing
        InventoryService->>RabbitMQ: INVENTORY_RESERVED → QUEUES.INVENTORY_EVENTS

        RabbitMQ->>PaymentService: Consume INVENTORY_RESERVED
        PaymentService->>PaymentService: Process Payment
        Note over PaymentService: 5s processing
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

This project has automated testing made with Bun, which are run automatically in Pull Requests, or manually by `bun run test`. If you want to test manually, I recommend testing via the UI as it gives the best overview of the system.

### Happy path

Happy path (=successful) is the scenario when everything goes fine: user creates an order, there's inventory and payment succeeds. See instructions in `services/order-service` how to run.

### Failure Scenarios

#### Payment Failure (with compensating transaction)

To test payment behavior, pass `paymentBehaviour` in the order creation request:

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d '{
    "items": [
      {
        "product": "laptop",
        "quantity": 1
      }
    ],
    "paymentBehaviour": "failure"
  }'
```

**Behaviour Options:**

- `"success"` - Operation succeeds (default if omitted)
- `"failure"` - Operation intentionally fails for testing
- `"random"` - 50% chance to succeed or fail

You can set both `paymentBehaviour` and `inventoryBehaviour` independently to test different failure scenarios.

When payment fails:

1. Order is created normally in PENDING status
2. Inventory is reserved successfully
3. Payment intentionally fails with "Transaction intentionally failed for testing purposes"
4. Order status is updated to CANCELLED
5. Inventory reservation is released (compensating transaction)

#### Inventory Failure

To test the inventory failure path, you can either:

1. **Force failure with behaviour flag:**

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d '{
    "items": [{"product": "laptop", "quantity": 1}],
    "inventoryBehaviour": "failure"
  }'
```

2. **Order non-existent product:**

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d '{"items": [{"product": "non-existent", "quantity": 1}]}'
```

3. **Order excessive quantity:**

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d '{"items": [{"product": "laptop", "quantity": 999}]}'
```

When inventory check fails:

1. Order is created in PENDING status
2. Inventory check fails (product not found, insufficient stock, or forced failure)
3. INVENTORY_FAILED event is published
4. Order status is updated to CANCELLED
5. No payment is attempted

### Seed Inventory

Before testing, seed the inventory with initial stock:

```bash
curl -X POST -H "x-session-id: your-session-id" http://localhost:3002/inventory/seed
```

## Running

See individual service folders for instructions.

## Session Isolation

We use **session-based data isolation** to support multiple concurrent users in public demos without data conflicts.

### How It Works

- Each user gets a unique session ID (UUID) stored in browser localStorage
- All database tables include a `session_id` column with composite primary keys
- All API requests include `x-session-id` header
- Session ID flows through the entire saga workflow via events
- Users only see their own orders, inventory, and payments

### Frontend Features

**Session Display & Regeneration:**

- Session ID shown in the UI
- Click the refresh button to generate a new session
- Sessions seeded automatically

### Implementation Details

**Database Schema:**

- Composite primary keys: `(id, session_id)` on products, orders, payments, reservations
- Indexed on `session_id` for query performance!
- Migration-safe: existing data gets `session_id = 'default'`

**Backend Changes:**

- All storage functions accept `sessionId` parameter
- All queries filter by `session_id`
- Event handlers extract and propagate `sessionId`
- API routes validate `x-session-id` header presence

## Notes

- Types are shared via `@swap/shared` package
- Monorepo structure for ease of development
- All services use idempotency keys for message deduplication
- Mock delays simulate real-world processing times
- New sessions start with fresh data for isolated testing
