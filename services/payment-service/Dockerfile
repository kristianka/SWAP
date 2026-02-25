FROM oven/bun:1.3.1-alpine AS base
WORKDIR /app

# Install dependencies for all workspace packages
FROM base AS deps
# Copy workspace configuration
COPY package.docker.json ./package.json
COPY bun.lock ./

# Copy shared package
COPY shared/package.json shared/
COPY shared/tsconfig.json shared/
COPY shared/src shared/src/

# Copy payment-service package.json
COPY services/payment-service/package.json services/payment-service/

# Install dependencies (this will resolve workspace:* dependencies)
RUN bun install

# Build stage - copy source code
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared ./shared
COPY package.docker.json ./package.json

# Copy payment-service source
COPY services/payment-service services/payment-service/

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy dependencies and source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/services/payment-service ./services/payment-service
COPY --from=deps /app/services/payment-service/node_modules ./services/payment-service/node_modules/
COPY package.docker.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "--cwd", "services/payment-service", "start"]
