# SWAP Frontend

React + TypeScript + Vite frontend for the SWAP distributed order processing system.

## Features

- **Real-time Order Tracking**: View orders as they progress through the saga workflow
- **Inventory Management**: Monitor stock levels, reservations, and availability
- **Payment Monitoring**: Track payment status and transactions
- **Session Isolation**: Each user gets an isolated data sandbox for demos

## Session Management

- **Session ID**: Auto-generated UUID stored in localStorage, displayed in header
- **Regenerate Button**: Creates fresh session with clean data
- **Seed Inventory Button**: Populates initial stock (required per session)

See main [README](../README.md#session-isolation) for architecture details.

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
