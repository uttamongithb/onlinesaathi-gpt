# =====================================================================
# Online Saathi GPT - Single Unified Docker Image
# For Railway, Render, and any Docker-based deployment
# Frontend + Backend एकसाथ (Single Container Deployment)
# =====================================================================

FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    jemalloc \
    python3 \
    py3-pip \
    curl \
    && rm -rf /var/cache/apk/*

# Set jemalloc for better memory management
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

# Add uv for MCP support
COPY --from=ghcr.io/astral-sh/uv:0.9.5-python3.12-alpine /usr/local/bin/uv /usr/local/bin/uvx /bin/

# Create app directory with proper permissions
RUN mkdir -p /app && chown node:node /app
WORKDIR /app

# Switch to non-root user
USER node

# Copy package files first (for Docker cache optimization)
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node api/package.json ./api/package.json
COPY --chown=node:node client/package.json ./client/package.json
COPY --chown=node:node packages/data-provider/package.json ./packages/data-provider/package.json
COPY --chown=node:node packages/data-schemas/package.json ./packages/data-schemas/package.json
COPY --chown=node:node packages/api/package.json ./packages/api/package.json
COPY --chown=node:node packages/client/package.json ./packages/client/package.json

# Configure npm for reliability and install dependencies
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 15000 && \
    npm ci --no-audit

# Copy all source code
COPY --chown=node:node . .

# Create required directories
RUN mkdir -p /app/client/public/images /app/logs /app/uploads

# Build packages first, then frontend
RUN npm run build:packages && \
    NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Prune dev dependencies to reduce image size
RUN npm prune --production && \
    npm cache clean --force

# Health check for Railway/Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3080}/api/health || exit 1

# Expose port (Railway/Render will auto-detect)
EXPOSE ${PORT:-3080}

# Environment defaults
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3080

# Start the full application (backend serves frontend)
CMD ["node", "api/server/index.js"]
