### Stage 1 — install deps + generate Prisma client
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

### Stage 2 — production runner
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Carry over installed modules
COPY --from=deps /app/node_modules ./node_modules

# Prisma schema + migrations folder (needed for "migrate deploy" at startup)
COPY prisma ./prisma

# Application source + TypeScript config
COPY src ./src
COPY tsconfig*.json ./
COPY package*.json ./
COPY prisma.config.ts ./

# Overwrite any stale committed generated client with the one built from current schema
COPY --from=deps /app/src/config/generated/prisma ./src/config/generated/prisma

EXPOSE 8080

# 1. Apply any pending DB migrations + regenerate client to match schema
# 2. Start the server via tsx (TypeScript runtime — no separate compile step)
CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && npx tsx src/app.ts"]
