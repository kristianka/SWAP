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

# Copy inventory-service package.json
COPY services/inventory-service/package.json services/inventory-service/

# Install dependencies (this will resolve workspace:* dependencies)
RUN bun install

# Build stage - copy source code
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared ./shared
COPY package.docker.json ./package.json

# Copy inventory-service source
COPY services/inventory-service services/inventory-service/

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy dependencies and source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/services/inventory-service ./services/inventory-service
COPY --from=deps /app/services/inventory-service/node_modules ./services/inventory-service/node_modules/
COPY package.docker.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "--cwd", "services/inventory-service", "start"]
