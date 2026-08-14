FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @kis/api... --frozen-lockfile=false
COPY apps/api apps/api
RUN pnpm --filter @kis/api prisma:generate && pnpm --filter @kis/api build
FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/apps/api ./apps/api
USER app
EXPOSE 4000
CMD ["node","apps/api/dist/src/main.js"]
