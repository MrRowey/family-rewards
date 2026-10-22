#!/usr/bin/env bash
set -e

if [ ! -f .env ]; then
  echo "🔐 Generating secure random credentials for first-time setup..."
  
  # Generate 32-character cryptographically secure random passwords
  DB_PASS=$(openssl rand -hex 16)
  JWT_SECRET=$(openssl rand -hex 32)

  cat <<EOF > .env
POSTGRES_USER=family_admin
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=family_rewards
JWT_SECRET=${JWT_SECRET}
EOF

  echo "✅ .env created with secure auto-generated passwords!"
else
  echo "ℹ️ Existing .env file detected. Using stored credentials."
fi

echo "🚀 Launching Family Rewards Kiosk Stack..."
docker compose up -d --build