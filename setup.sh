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
ENV_FILE="$APP_DIR/server/.env"
ENV_EXAMPLE="$APP_DIR/server/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "  Created server/.env from server/.env.example"
  else
    local_pass=$(openssl rand -base64 24 2>/dev/null || echo "CHANGE_ME")
    cat > "$ENV_FILE" <<-EOF
PORT=3001
NODE_ENV=production
OPENCODE_SERVER_PASSWORD=$local_pass
AUTH_USERNAME=change-me
AUTH_PASSWORD=change-me
EOF
    echo "  Created default server/.env with random password"
  fi
else
  echo "  server/.env exists, checking for missing vars..."
  if [ -f "$ENV_EXAMPLE" ]; then
    while IFS='=' read -r key rest; do
      case "$key" in
        ''|'#'*) continue ;;
        *)
          if ! grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
            echo "  Adding missing $key"
            printf '%s=%s\n' "$key" "$rest" >> "$ENV_FILE"
          fi
          ;;
      esac
    done < "$ENV_EXAMPLE"
  fi
fi

set -a; source "$ENV_FILE"; set +a

# --- Install dependencies ---
echo ""
echo "[4/6] Installing dependencies..."
echo "  Server..."
cd "$APP_DIR/server"
npm install --include=dev 2>&1 | sed 's/^/    /'
npx prisma generate 2>&1 | sed 's/^/    /'
npx prisma db push --accept-data-loss 2>&1 | sed 's/^/    /'

echo "  Client..."
cd "$APP_DIR/client"
npm install --include=dev 2>&1 | sed 's/^/    /'

# --- Build ---
echo ""
echo "[5/6] Building..."
echo "  Server (TypeScript)..."
cd "$APP_DIR/server"
echo "    Compiling..."
TSC_BIN="$APP_DIR/server/node_modules/.bin/tsc"
if [ ! -f "$TSC_BIN" ]; then
  echo "    ✗ TypeScript not found, installing..."
  npm install --include=dev 2>&1 | sed 's/^/    /'
fi
if "$TSC_BIN" 2>&1; then
  echo "    ✓ TypeScript compiled successfully"
else
  echo "    ✗ TypeScript compilation failed"
  exit 1
fi

echo "  Client (Next.js production build)..."
cd "$APP_DIR/client"
npx next build 2>&1 | sed 's/^/    /'

# --- Logs directory ---
mkdir -p "$APP_DIR/logs"

# --- Start with PM2 ---
echo ""
echo "[6/6] Starting with PM2..."
cd "$APP_DIR"
pm2 delete netma-server netma-client 2>/dev/null || true
pm2 start ecosystem.config.js

# Save PM2 process list for auto-restart on reboot
pm2 save

echo ""
echo "========================================"
echo "  Netma is running!"
echo "  URL:      http://localhost:${PORT:-3001}"
echo "  Logs:     $APP_DIR/logs/"
echo "  PM2:      pm2 status | pm2 logs"
echo "========================================"
