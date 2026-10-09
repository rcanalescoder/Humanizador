FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HUMANIZADOR_BIND=0.0.0.0 HUMANIZADOR_DATA_DIR=/app/data PORT=8787
COPY package*.json ./
RUN npm ci --omit=dev && mkdir /app/data && chown node:node /app/data
COPY --from=build /app/dist ./dist
COPY server ./server
COPY core ./core
COPY rules ./rules
COPY tools ./tools
USER node
EXPOSE 8787
CMD ["node","tools/run.mjs"]
