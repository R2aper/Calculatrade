#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine and the Compose plugin first." >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "Created .env.production. Set POSTGRES_PASSWORD and JWT_SECRET, then run this script again." >&2
  exit 1
fi

set -a
. ./.env.production
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is missing in .env.production}"
: "${JWT_SECRET:?JWT_SECRET is missing in .env.production}"

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps

echo "Calculatrade is available at http://<server-ip>:${APP_PORT:-80}"
