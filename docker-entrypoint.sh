#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 3

echo "Running database migrations..."
npx prisma migrate deploy || {
  echo "No migrations found, creating database schema..."
  npx prisma db push --accept-data-loss
}

echo "Seeding database..."
npx prisma db seed || echo "Seed failed or already run"

echo "Starting application..."
exec node dist/main.js
