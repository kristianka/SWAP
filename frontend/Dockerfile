FROM oven/bun:1.3.1-alpine AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps

# Create workspace configuration that includes frontend
RUN echo '{"name":"swap-frontend","private":true,"workspaces":["shared","frontend"]}' > package.json

# Copy shared package (needed for workspace:* dependency)
COPY shared/package.json shared/
COPY shared/tsconfig.json shared/
COPY shared/src shared/src/

# Copy frontend package.json and lockfile
COPY frontend/package.json frontend/
COPY frontend/bun.lock frontend/bun.lock

# Install dependencies (this will resolve workspace:* dependencies)
RUN bun install

# Build stage - compile the frontend
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared ./shared
COPY --from=deps /app/frontend ./frontend
COPY --from=deps /app/package.json ./package.json

# Copy frontend source code
COPY frontend/tsconfig*.json frontend/
COPY frontend/vite.config.ts frontend/
COPY frontend/index.html frontend/
COPY frontend/components.json frontend/
COPY frontend/src frontend/src/
COPY frontend/public frontend/public/

WORKDIR /app/frontend
RUN bun run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy built assets from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional)
# COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
