# Base image
FROM node:22-alpine3.21 AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN apk update && apk upgrade --no-cache && npm ci

# Build stage
FROM deps AS builder
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install runtime dependencies
RUN apk update && apk upgrade --no-cache

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
