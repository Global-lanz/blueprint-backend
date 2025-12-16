#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 3

echo "Pushing database schema..."
npx prisma db push --skip-generate

echo "Generating Prisma Client..."
npx prisma generate

echo "Seeding database..."
npx prisma db seed || echo "Seed failed or already run"

echo "Starting application..."
exec node dist/main.js
