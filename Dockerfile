# Multi-stage build for React app
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_URL=/api
ARG VITE_WEBSOCKET_URL
ARG VITE_APP_NAME=Typelets
ARG VITE_APP_VERSION=0.0.0

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_WEBSOCKET_URL=${VITE_WEBSOCKET_URL}

# Build the app
RUN pnpm run build

# Production stage with Nginx
FROM nginx:alpine

# Install curl for health checks and gettext for envsubst
RUN apk add --no-cache curl gettext

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Create entrypoint script
RUN printf '#!/bin/sh\n\
set -e\n\
\n\
# Set defaults if not provided\n\
export BACKEND_URL=${BACKEND_URL:-https://api.typelets.com}\n\
export BACKEND_HOST=$(echo $BACKEND_URL | sed -e "s|^[^/]*//||" -e "s|/.*$||")\n\
\n\
echo "Starting with backend: $BACKEND_URL (Host: $BACKEND_HOST)"\n\
\n\
# Substitute environment variables in nginx config\n\
envsubst "\$BACKEND_URL \$BACKEND_HOST" < /etc/nginx/templates/default.conf.template > /etc/nginx/nginx.conf\n\
\n\
# Start nginx\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Create non-root user and set proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /usr/share/nginx/html && \
    chown -R nodejs:nodejs /var/cache/nginx && \
    chown -R nodejs:nodejs /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nodejs:nodejs /var/run/nginx.pid && \
    chown -R nodejs:nodejs /etc/nginx && \
    chown nodejs:nodejs /docker-entrypoint.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Cache busting argument
ARG CACHEBUST=1

# Add labels for better container management
LABEL maintainer="your-email@example.com" \
      version="0.0.0" \
      description="Typelets Frontend Application"

# Expose port 8080 (non-privileged port)
EXPOSE 8080

# Switch to non-root user
USER nodejs

# Use the custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
