FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
