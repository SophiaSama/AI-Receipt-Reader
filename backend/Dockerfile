# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-slim AS build

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
FROM node:20-slim AS production

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

# Bake Tesseract language data into the image so the worker never
# downloads anything at runtime.  eng.traineddata ≈ 4 MB.
RUN mkdir -p /app/tessdata && \
    apt-get update && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    wget -q -O /app/tessdata/eng.traineddata \
      "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata" && \
    apt-get purge -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Environment
ENV NODE_ENV=production
ENV TESSDATA_PREFIX=/app/tessdata
ENV PORT=8080

EXPOSE 8080

# Run as non-root for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

CMD ["node", "dist/local/server.js"]
