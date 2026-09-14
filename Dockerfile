# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Production runtime stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create required directories with correct permissions for non-root node user
RUN mkdir -p /app/data /app/public && chown -R node:node /app

# Copy production node_modules from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public
COPY --chown=node:node data ./data

# Switch to non-root user
USER node

EXPOSE 3000

CMD ["node", "server.js"]
