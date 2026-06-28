# ---- Build stage ----
FROM node:20-slim AS build

WORKDIR /app

# Install ALL dependencies (including devDependencies for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production stage ----
FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

# Cloud Run injects PORT at runtime; default to 3000 for local testing
ENV PORT=3000
EXPOSE ${PORT}

CMD ["npm", "start"]
