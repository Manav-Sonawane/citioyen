# ---- Build stage ----
FROM node:20-slim AS build

WORKDIR /app

# Copy workspace root manifests + backend's own package.json
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

# Install all workspace dependencies (including devDependencies for tsc)
RUN npm ci

# Copy backend source and compile
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/src backend/src
RUN npm run build --workspace=backend

# ---- Production stage ----
FROM node:20-slim

WORKDIR /app

# Copy workspace root manifests + backend's own package.json
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build /app/backend/dist backend/dist

# Cloud Run injects PORT at runtime; default to 3000 for local testing
ENV PORT=3000
EXPOSE ${PORT}

CMD ["node", "backend/dist/index.js"]
