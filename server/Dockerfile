# LIBAS api server: Node 20 on Alpine, dependencies installed, migrations
# and seed run on boot via docker-entrypoint.sh.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
