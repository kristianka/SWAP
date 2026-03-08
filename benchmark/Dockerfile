FROM node:22-alpine AS builder

WORKDIR /app

# Copy benchmark package files
COPY benchmark/package.json benchmark/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source
COPY benchmark/src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Production image
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root user
USER node

ENTRYPOINT ["node", "dist/index.js"]
