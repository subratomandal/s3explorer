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
COPY apps/server/package*.json ./
RUN npm ci
COPY apps/server/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package*.json ./

# Copy client build to be served by the server
COPY --from=client-builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
