# syntax=docker/dockerfile:1

# ── Etapa 1: dependencias ──────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# package-lock.json presente → instalación reproducible con npm ci
COPY package.json package-lock.json ./
RUN npm ci

# ── Etapa 2: build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next build — NO requiere secretos: todo el env se lee en runtime (server-side).
RUN npm run build

# ── Etapa 3: runtime ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios
RUN addgroup -g 1001 -S nodejs \
 && adduser  -u 1001 -S nextjs -G nodejs

# Output 'standalone': server.js + node_modules mínimos. Copiamos también
# los estáticos y la carpeta public (no van dentro de standalone).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Healthcheck: la raíz "/" (login) responde 200.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
