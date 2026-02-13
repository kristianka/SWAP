# SWAP Frontend

React + TypeScript + Vite frontend for the SWAP distributed order processing system.

## Features

- **Real-time Order Tracking**: View orders as they progress through the saga workflow
- **Inventory Management**: Monitor stock levels, reservations, and availability
- **Payment Monitoring**: Track payment status and transactions
- **Session Isolation**: Each user gets an isolated data sandbox for demos

## Session Management

The frontend implements session-based isolation for multi-user demo environments:

### Session ID

- Automatically generated UUID on first visit
- Stored in browser localStorage (`swap-demo-session-id`)
- Displayed in the header at the top-right of the page
- Included in all API requests via `x-session-id` header

### Session Controls

- **Regenerate Button**: Creates a new session ID
  - Clears all previous data from view
  - Provides fresh isolated environment
  - Useful for starting new demos!

### Seed Inventory

- **"Seed Inventory" button**: Populates initial product stock
  - Gaming Laptop (5 units)
  - Wireless Mouse (67 units)
  - Mechanical Keyboard (21 units)
  - 4K Monitor (15 units)
- Must be clicked for each new session to have products available

## API Communication

All API calls automatically include the session ID header:

```typescript
headers: {
  'x-session-id': getOrCreateSessionId(),
  // other headers...
}
```

### API Endpoints

- **Order Service** (port 3001): `/orders`
- **Inventory Service** (port 3002): `/inventory`, `/inventory/seed`
- **Payment Service** (port 3003): `/payments`

## Running

```bash
bun install
bun run dev
```

Ensure all backend services are running first (order-service, inventory-service, payment-service, RabbitMQ, PostgreSQL).
