#!/bin/sh
set -e

echo "Starting Metro bundler (clearing cache)..."
npx expo start --web --host lan --reset-cache &
METRO_PID=$!

# Wait until Metro is ready
echo "Waiting for Metro to be ready..."
until wget -q -O /dev/null http://localhost:8081 2>/dev/null; do
  sleep 3
done
echo "Metro is ready."

# Pre-warm iOS bundle so phone doesn't time out
echo "Pre-warming iOS bundle (first time ~20 seconds)..."
wget -q -O /dev/null --timeout=180 \
  "http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable" \
  && echo "iOS bundle ready." || echo "iOS bundle warmup failed (will compile on connect)."

# Pre-warm Android bundle
echo "Pre-warming Android bundle..."
wget -q -O /dev/null --timeout=180 \
  "http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable" \
  && echo "Android bundle ready." || echo "Android bundle warmup failed." &

# Serve a QR code page on port 8082 so you can scan without typing in Expo Go
HOST="${REACT_NATIVE_PACKAGER_HOSTNAME:-localhost}"
EXP_URL="exp://${HOST}:8081"
ENCODED=$(node -e "process.stdout.write(encodeURIComponent('${EXP_URL}'))")

node -e "
const http = require('http');
const html = \`<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <title>Plasticon Mobile</title>
  <style>
    body { margin:0; background:#0D1321; display:flex; flex-direction:column;
           align-items:center; justify-content:center; min-height:100vh;
           font-family:sans-serif; color:#fff; }
    h2   { font-size:1.3rem; margin-bottom:4px; }
    p    { color:#888; font-size:.9rem; margin:8px 0 24px; }
    img  { border-radius:12px; background:#fff; padding:12px; }
    .url { margin-top:20px; background:#1a2a3a; padding:10px 20px;
           border-radius:8px; font-size:.85rem; color:#60a5fa; }
  </style>
</head>
<body>
  <h2>Scan with iPhone Camera</h2>
  <p>Opens Expo Go automatically</p>
  <img src='https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${ENCODED}' width='280' height='280'>
  <div class='url'>${EXP_URL}</div>
</body>
</html>\`;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(8082, () => console.log('QR code page ready at http://localhost:8082'));
" &

echo ""
echo "========================================"
echo " Mobile ready!"
echo " Web app  : http://localhost:8081"
echo " QR page  : http://localhost:8082  <-- open this on your PC and scan"
echo " Expo Go  : ${EXP_URL}"
echo "========================================"

wait $METRO_PID
