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
COPY startup.sh ./startup.sh

# Overwrite any stale committed generated client with the one built from current schema
COPY --from=deps /app/src/config/generated/prisma ./src/config/generated/prisma

RUN chmod +x startup.sh

EXPOSE 8080

CMD ["sh", "startup.sh"]
