# payment-service

Processes payments for orders and maintains payment transaction records.

## Install & Run

```bash
bun install
bun run dev
```

## API Endpoints

### Get Payments

```bash
curl http://localhost:3003/payments
```

Returns all payment transactions with their status (SUCCESS/FAILED).

## Database

The payment service maintains two tables:

- **payments** - Stores payment transaction records (id, order_id, amount, status)
- **processed_events** - Idempotency tracking to prevent duplicate processing

## Saga Participation

The payment service participates in the order saga:

1. **INVENTORY_RESERVED** → Process payment (mock 3s delay)
   - On success: Save payment record with status "SUCCESS", emit PAYMENT_SUCCESS
   - On failure: Save payment record with status "FAILED", emit PAYMENT_FAILED
2. Payment results trigger:
   - **PAYMENT_SUCCESS** → Order completion & inventory confirmation
   - **PAYMENT_FAILED** → Order cancellation & inventory release (compensating transaction)

## Payment Processing

Currently uses mock payment logic:

- Calculates amount: `quantity * $10` per item
- Generates unique transaction ID: `txn_<uuid>`
- Simulates couple second processing delay
- All transactions are persisted to the database for audit trail
