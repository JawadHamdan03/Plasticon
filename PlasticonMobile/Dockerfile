FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
# Use npm install instead of npm ci — lock file is out of sync with package.json
RUN npm install --legacy-peer-deps

COPY . .

# Expo Metro bundler port + web port + dev tools
EXPOSE 8081 8082 19000 19001 19002

# EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 lets the bundler bind to all interfaces
# so the host machine (and physical devices on the same network) can connect
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# --web   → also serves the Expo Web version at http://localhost:8082
# --host  → binds Metro to 0.0.0.0 so it is reachable outside the container
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
