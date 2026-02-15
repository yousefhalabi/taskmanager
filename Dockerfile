# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN npm install

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install any missing dependencies referenced in code
RUN npm install papaparse 2>/dev/null || true

# Generate Prisma client
RUN npx prisma generate

# Create an initialized empty database with the schema applied
RUN DATABASE_URL=file:/tmp/seed.db npx prisma db push

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove unnecessary files from standalone to reduce image size
RUN find .next/standalone/node_modules/@prisma/client/runtime \
      -name "*.map" -delete 2>/dev/null; \
    find .next/standalone/node_modules/@prisma/client/runtime \
      \( -name "*cockroachdb*" -o -name "*mysql*" -o -name "*postgresql*" -o -name "*sqlserver*" \) \
      -delete 2>/dev/null; \
    rm -rf .next/standalone/node_modules/@prisma/client/runtime/react-native* 2>/dev/null; \
    rm -rf .next/standalone/node_modules/@prisma/client/runtime/edge* 2>/dev/null; \
    rm -rf .next/standalone/node_modules/@prisma/client/runtime/wasm-*edge* 2>/dev/null; \
    rm -rf .next/standalone/node_modules/@prisma/client/runtime/index-browser* 2>/dev/null; \
    rm -rf .next/standalone/node_modules/@prisma/client/generator-build 2>/dev/null; \
    rm -rf .next/standalone/node_modules/typescript 2>/dev/null; \
    true

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output (includes node_modules the app needs)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy the initialized empty database as a seed template
COPY --from=builder /tmp/seed.db /app/seed.db

# Create data directory for SQLite and set permissions
RUN mkdir -p /data && chown -R nextjs:nodejs /data
RUN chown -R nextjs:nodejs /app

# Entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
