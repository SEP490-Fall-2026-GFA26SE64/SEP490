FROM node:22-alpine AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS dev
COPY . .
EXPOSE 5173
# Compose retains node_modules in a volume across image rebuilds. Reconcile it
# with the bind-mounted lockfile before Vite starts; never reuse stale packages.
CMD ["/bin/sh", "-ec", "npm ci --no-audit --no-fund; exec npm run dev -- --host 0.0.0.0"]

FROM dependencies AS build
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /workspace/dist /srv
EXPOSE 80
