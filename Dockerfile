# Build stage for client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY apps/client/package*.json ./
RUN npm ci
COPY apps/client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

# Install native deps for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

COPY apps/server/package*.json ./
RUN npm ci
COPY apps/server/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install native deps for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package*.json ./

# Rebuild native modules for Alpine
RUN npm rebuild better-sqlite3

# Copy client build to be served by the server
COPY --from=client-builder /app/client/dist ./public

# Create data directory for SQLite and encryption key
RUN mkdir -p /data && chown -R node:node /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Run as non-root user
USER node

EXPOSE 3000



CMD ["node", "dist/index.js"]
