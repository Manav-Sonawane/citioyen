# ---- Build stage ----
FROM node:20-slim AS build

WORKDIR /app

# Copy workspace root manifests + frontend's own package.json
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json

# Install all workspace dependencies
RUN npm ci

# Copy frontend source and compile
COPY frontend/ frontend/
RUN npm run build --workspace=frontend

# ---- Production stage ----
FROM node:20-slim

WORKDIR /app

# Install 'serve' globally (a lightweight Node static file server)
RUN npm install -g serve

# Copy built static files from build stage
COPY --from=build /app/frontend/dist ./dist

# Cloud Run injects PORT at runtime; default to 8080 for local testing
ENV PORT=8080
EXPOSE ${PORT}

# Serve the static files as a Single Page Application (-s routes all 404s to index.html)
CMD ["serve", "-s", "dist", "-l", "8080"]
