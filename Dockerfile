# LIBAS single-container deploy: build the React client, then serve it and
# the API from one Node process. Postgres comes from DATABASE_URL; migrations
# and the demo seed run on boot via docker-entrypoint.sh.
FROM node:20-alpine AS client

WORKDIR /client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client /client/dist /app/public

ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

ENTRYPOINT ["./docker-entrypoint.sh"]
