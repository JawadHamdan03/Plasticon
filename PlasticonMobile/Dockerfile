FROM node:20-alpine

RUN apk add --no-cache git wget

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

RUN chmod +x startup.sh

# startup.sh: starts Metro, pre-warms iOS/Android bundles, serves QR code on :8082
CMD ["sh", "startup.sh"]
