FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=development
ENV PORT=8080
ENV DATABASE_URL=postgres://postgres:123456@host.docker.internal:5433/plasticon?sslmode=disable
ENV JWT_SECRET=a-string-secret-at-least-256-bits-long

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run apply-schema
RUN npm run seed
EXPOSE 8080
CMD ["npm", "run", "dev"]
