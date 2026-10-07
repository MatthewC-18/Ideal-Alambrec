# Cotizador Ideal Alambrec — imagen de la aplicación
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 cotizador
COPY --from=build --chown=cotizador /app ./
USER cotizador
EXPOSE 3000
# Applies pending migrations, loads the initial data (idempotent) and starts the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start -p ${PORT}"]
