FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential ca-certificates && rm -rf /var/lib/apt/lists/* \
 && if [ -f package-lock.json ]; then npm ci --production=false; else npm install; fi
COPY . .
RUN npx prisma generate
RUN npm run build

# Optional: generate prisma client again to ensure it's available in final image

FROM node:20-bullseye-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333
CMD ["node", "dist/main.js"]
