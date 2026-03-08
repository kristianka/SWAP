FROM node:25-alpine AS builder

WORKDIR /app

# Copy benchmark package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Production image
# ============================================================================
FROM node:25-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root user
USER node

ENTRYPOINT ["node", "dist/index.js"]
