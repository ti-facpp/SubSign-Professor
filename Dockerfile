# --- build: front (vite) + servidor empacotado com esbuild ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run lint \
  && npm run build \
  && npx esbuild server.ts --bundle --platform=node --format=esm \
       --packages=external --outfile=server.mjs \
  && npm prune --omit=dev

# --- runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# PDFs enviados para assinatura (volume subsign_data no docker-compose)
ENV DATA_DIR=/app/data

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./

RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
