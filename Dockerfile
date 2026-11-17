# ==============================================================================
# CHAOS MONOPOLY — PRODUCTION DOCKERFILE
# Multi-stage build for hardened, lightweight container deployment
# ==============================================================================

# STAGE 1: Build Frontend and Server Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Clean install all dependencies (including devDependencies for build)
RUN npm ci

# Copy full application source code
COPY . .

# Build production bundle (TypeScript compilation + Vite code splitting)
RUN npm run build

# Prune devDependencies for a lean production footprint
RUN npm prune --production

# ==============================================================================
# STAGE 2: Lightweight Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001
ENV MULTIPLAYER_HOST=0.0.0.0
ENV MULTIPLAYER_DB_PATH=/app/data/chaos-multiplayer.sqlite

# Create volume mount directory for SQLite WAL database
RUN mkdir -p /app/data && chown -R node:node /app

# Copy production node_modules from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy package manifests and compiled client dist
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/src ./src

# Expose HTTP API, Static Assets & WebSocket Port
EXPOSE 3001

# Switch to unprivileged non-root user for security hardening
USER node

# Health check using HTTP ready endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/ready || exit 1

# Start authoritative server
CMD ["node", "--experimental-strip-types", "src/server/index.ts"]
