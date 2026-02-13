# inventory-service

Manages product inventory, stock reservations, and compensating transactions.

## Install & Run

```bash
bun install
bun run dev
```

## API Endpoints

### Get Inventory

```bash
curl http://localhost:3002/inventory
```

Returns all products with current stock levels and reservation details.

### Seed Initial Data

```bash
curl -X POST http://localhost:3002/inventory/seed
```

Seeds products with initial stock levels for testing.

### Get Statistics

```bash
curl http://localhost:3002/inventory/stats
```

Returns aggregated inventory statistics:

```json
{
  "products": {
    "total_products": 7,
    "total_stock": 235,
    "total_reserved": 0,
    "total_available": 235
  },
  "reservations": {
    "pending_reservations": 0,
    "confirmed_reservations": 2,
    "total_reservations": 2
  }
}
```

## Database

The inventory service maintains three tables:

- **products** - Stores product details (id, name, stock, reserved_stock)
- **reservations** - Tracks stock reservations by order (id, order_id, product_id, quantity, status)
- **processed_events** - Idempotency tracking to prevent duplicate processing

## Saga Participation

The inventory service participates in the order saga:

1. **ORDER_CREATED** → Reserve inventory
   - Checks if sufficient stock available for all items
   - On success: Creates reservations with status "PENDING", increments reserved_stock, emits INVENTORY_RESERVED
   - On failure: Emits INVENTORY_FAILED (order cancelled immediately)

2. **PAYMENT_SUCCESS** → Confirm reservation (compensating transaction)
   - Updates reservation status to "CONFIRMED"
   - Deducts confirmed quantity from stock (final commitment)
   - Decrements reserved_stock

3. **PAYMENT_FAILED** → Release reservation (compensating transaction)
   - Updates reservation status to "RELEASED"
   - Returns reserved stock to available pool
   - Decrements reserved_stock (rollback)

## Reservation States

Reservations progress through three states:

- **PENDING** - Stock temporarily reserved, awaiting payment
- **CONFIRMED** - Payment successful, stock permanently deducted
- **RELEASED** - Payment failed or order cancelled, stock returned to pool
