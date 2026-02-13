# order-service

Orchestrates the order saga, managing order lifecycle and coordinating between inventory and payment services.

## Install & Run

```bash
bun install
bun run dev
```

## API Endpoints

**Note:** All endpoints require `x-session-id` header for data isolation.

### Get Orders

```bash
curl -H "x-session-id: your-session-id" http://localhost:3001/orders
```

Returns all orders with their current status for the specified session.

### Get Order by ID

```bash
curl -H "x-session-id: your-session-id" http://localhost:3001/orders/<order-id>
```

### Create Order

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d @dummy-order.json
```

### Reset Orders

```bash
curl -X POST -H "x-session-id: your-session-id" http://localhost:3001/orders/reset
```

Resets all orders for the specified session (testing purposes).

## Database

The order service maintains two tables:

- **orders** - Stores order records with composite primary key `(id, session_id)` for isolation
- **processed_events** - Idempotency tracking to prevent duplicate processing

### Session Isolation

- Composite primary key `(id, session_id)` ensures data isolation
- All queries filter by `session_id` from request headers or events
- Session ID propagates through entire saga via event correlation
- Each user session maintains independent order history

## Saga Orchestration

The order service acts as the saga coordinator, managing the distributed transaction flow:

1. **Order Creation** → Emit ORDER_CREATED event
   - Creates order with status "PENDING"
   - Assigns unique saga ID for end-to-end tracing
   - Triggers inventory reservation

2. **INVENTORY_RESERVED** → Triggers payment processing
   - Payment service processes payment (5s mock delay)

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
