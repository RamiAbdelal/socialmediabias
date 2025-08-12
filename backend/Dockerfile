# Base image
FROM node:22-alpine3.21 AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN apk update && apk upgrade --no-cache && npm ci


# Production image
FROM node:22-alpine3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install runtime dependencies
RUN apk update && apk upgrade --no-cache

# Copy app code and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY ./app ./app
COPY package.json ./

EXPOSE 3001
CMD ["node", "app/index.js"]
