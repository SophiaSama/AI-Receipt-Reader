# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
COPY local/ ./local/
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run as non-root for security
RUN addgroup -S appuser && adduser -S appuser -G appuser
RUN chown -R appuser:appuser /app
USER appuser

CMD ["node", "dist/local/server.js"]
