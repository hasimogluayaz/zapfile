#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu server for the ZapFile Office API.
#   curl -fsSL https://raw.githubusercontent.com/hasimogluayaz/zapfile/<branch>/server/office-api/setup.sh | sudo bash -s <api-domain> [branch]
# Safe to run again: it updates the code and restarts the containers.
set -euo pipefail

DOMAIN="${1:?usage: setup.sh <api-domain> [branch]}"
BRANCH="${2:-main}"
DIR=/opt/zapfile

echo "==> Swap (helps small servers with large documents)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "==> Packages: Docker, git, automatic security updates, firewall"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 git unattended-upgrades ufw
systemctl enable --now docker
dpkg-reconfigure -f noninteractive unattended-upgrades

ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null

echo "==> Code ($BRANCH)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse https://github.com/hasimogluayaz/zapfile.git "$DIR"
  git -C "$DIR" sparse-checkout set server
fi

cd "$DIR/server/office-api"
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/^API_DOMAIN=.*/API_DOMAIN=$DOMAIN/" .env
  # Size parallel conversions to the server's memory (~400 MB each, keep room for the system).
  MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  SLOTS=$(( MEM_MB > 1800 ? (MEM_MB - 600) / 450 : 1 ))
  LIMIT=$(( MEM_MB > 1800 ? MEM_MB - 400 : 900 ))
  sed -i "s/^CONCURRENCY=.*/CONCURRENCY=$SLOTS/; s/^API_MEM_LIMIT=.*/API_MEM_LIMIT=${LIMIT}m/" .env
fi

echo "==> Build and start"
docker compose up -d --build
docker image prune -f >/dev/null

echo
echo "Done. Check: curl https://$DOMAIN/health"
echo "Logs:  cd $DIR/server/office-api && docker compose logs -f"
