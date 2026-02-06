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

### Seed Initial Data

Seeds products with initial stock levels for testing:

```bash
curl -X POST http://localhost:3002/inventory/seed
```

### Get Statistics

```bash
curl http://localhost:3002/inventory/stats
```

Returns:

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

## Saga Participation

The inventory service participates in the order saga:

1. **ORDER_CREATED** → Reserve inventory (or emit INVENTORY_FAILED)
2. **PAYMENT_SUCCESS** → Confirm reservation (deduct from stock)
3. **PAYMENT_FAILED** → Release reservation (compensating transaction)
