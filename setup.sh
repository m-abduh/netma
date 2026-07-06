#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "========================================"
echo "  Netma Production Setup"
echo "========================================"

# --- Prerequisites ---
echo ""
echo "[1/6] Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js required. Install from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "ERROR: npm required."; exit 1; }
command -v pm2  >/dev/null 2>&1 || { echo "Installing PM2 globally..."; npm install -g pm2; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
echo "  Node.js: $(node -v)"
echo "  npm:     $(npm -v)"
echo "  PM2:     $(pm2 -v 2>/dev/null || echo 'installed')"

# --- OpenCode CLI ---
echo ""
echo "[2/6] Checking opencode CLI..."
if command -v opencode >/dev/null 2>&1; then
  echo "  opencode: $(opencode --version 2>/dev/null || echo 'installed')"
else
  echo "  Installing opencode globally..."
  npm install -g opencode
fi

# --- Environment ---
echo ""
echo "[3/6] Setting up environment..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
  else
    cat > .env <<-EOF
PORT=3001
NODE_ENV=production
OPENCODE_SERVER_PASSWORD=netma-secret
EOF
    echo "  Created default .env"
  fi
else
  echo "  .env already exists, skipping"
fi

source .env

# --- Install dependencies ---
echo ""
echo "[4/6] Installing dependencies..."
echo "  Server..."
cd "$APP_DIR/server"
npm install --omit=dev 2>&1 | sed 's/^/    /'
npx prisma generate 2>&1 | sed 's/^/    /'
npx prisma db push --accept-data-loss 2>&1 | sed 's/^/    /'

echo "  Client..."
cd "$APP_DIR/client"
npm install --omit=dev 2>&1 | sed 's/^/    /'

# --- Build ---
echo ""
echo "[5/6] Building..."
echo "  Server (TypeScript)..."
cd "$APP_DIR/server"
npx tsc 2>&1 | sed 's/^/    /'

echo "  Client (Next.js static export)..."
cd "$APP_DIR/client"
npx next build 2>&1 | sed 's/^/    /'

# --- Logs directory ---
mkdir -p "$APP_DIR/logs"

# --- Start with PM2 ---
echo ""
echo "[6/6] Starting with PM2..."
cd "$APP_DIR"
pm2 delete netma-server 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# Save PM2 process list for auto-restart on reboot
pm2 save

echo ""
echo "========================================"
echo "  Netma is running!"
echo "  URL:      http://localhost:${PORT:-3001}"
echo "  Logs:     $APP_DIR/logs/"
echo "  PM2:      pm2 status | pm2 logs"
echo "========================================"
