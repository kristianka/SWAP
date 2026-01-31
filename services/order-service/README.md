# order-service

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

### Create order

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d @services/order-service/dummy-order.json
```
