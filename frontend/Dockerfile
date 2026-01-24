# Frontend Dockerfile for development
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (will be overridden by volume in dev)
COPY . .

# Expose port
EXPOSE 3001

# Run dev server
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
