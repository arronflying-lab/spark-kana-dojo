# KanaDojo Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# basePath is a build-time Next.js setting. The production mount keeps the
# prefix on the request path, so the container must be built with the same
# prefix that Nginx exposes.
ARG KANA_DOJO_BASE_PATH=/kanadojo
ARG NEXT_PUBLIC_KANA_DOJO_BASE_PATH=/kanadojo
ENV KANA_DOJO_BASE_PATH=${KANA_DOJO_BASE_PATH}
ENV NEXT_PUBLIC_KANA_DOJO_BASE_PATH=${NEXT_PUBLIC_KANA_DOJO_BASE_PATH}

# Generate static assets and types
RUN npm run i18n:check
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
