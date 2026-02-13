# order-service

Orchestrates the order saga, managing order lifecycle and coordinating between inventory and payment services.

## Install & Run

```bash
bun install
bun run dev
```

## API Endpoints

### Get Orders

```bash
curl http://localhost:3001/orders
```

Returns all orders with their current status.

### Get Order by ID

```bash
curl http://localhost:3001/orders/<order-id>
```

### Create Order

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d @dummy-order.json
```

### Reset Orders

```bash
curl -X POST http://localhost:3001/orders/reset
```

Resets all orders for testing purposes.

## Database

The order service maintains two tables:

- **orders** - Stores order records (id, saga_id, items, status, error_message, created_at)
- **processed_events** - Idempotency tracking to prevent duplicate processing

## Saga Orchestration

The order service acts as the saga coordinator, managing the distributed transaction flow:

1. **Order Creation** → Emit ORDER_CREATED event
   - Creates order with status "PENDING"
   - Assigns unique saga ID for end-to-end tracing
   - Triggers inventory reservation

2. **INVENTORY_RESERVED** → Triggers payment processing
   - Payment service processes payment (3s mock delay)

3. **PAYMENT_SUCCESS** → Order completion
   - Updates order status to "COMPLETED"
   - Inventory confirms reservation (final stock deduction)

4. **PAYMENT_FAILED** → Compensating transaction
   - Updates order status to "CANCELLED"
   - Inventory releases reservation (rollback)

5. **INVENTORY_FAILED** → Order cancellation
   - Updates order status to "CANCELLED"
   - No payment attempted (early failure)

## Order Timeout

Orders stuck in "PENDING" status for more than 30 seconds are automatically cancelled by the timeout monitor. This prevents resource locks from hanging indefinitely if a service fails to respond.
