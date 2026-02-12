# Base image
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY server/package.json ./server/
RUN npm install

# Build stage
FROM base AS builder
ARG API_INTERNAL_URL=http://api:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN cd app && npm run build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_URL=file:/config/mediarr.db

# Create persistent volume directories
RUN mkdir -p /config \
    /data/downloads/incomplete \
    /data/downloads/complete \
    /data/media/tv \
    /data/media/movies

COPY --from=builder /app/package.json ./
COPY --from=builder /app/app/package.json ./app/
COPY --from=builder /app/app/.next ./app/.next
COPY --from=builder /app/app/public ./app/public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

VOLUME ["/config", "/data"]

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=app"]
