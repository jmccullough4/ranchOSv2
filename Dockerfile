# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install

FROM deps AS build
COPY frontend frontend
COPY server server
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 8082

CMD ["npm", "start"]
