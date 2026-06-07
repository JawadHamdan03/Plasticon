### Stage 1 — build the React/Vite app
FROM node:20-alpine AS builder

WORKDIR /app

# Accept backend + RAG URLs at build time (Vite bakes them into the bundle)
ARG VITE_API_URL=http://localhost:8080
ARG VITE_RAG_URL=http://localhost:3001

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RAG_URL=$VITE_RAG_URL

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

### Stage 2 — serve with nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
