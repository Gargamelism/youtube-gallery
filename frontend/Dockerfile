FROM node:24-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
CMD ["npm", "test"]

# Playwright E2E stage — uses Debian so Chromium system deps are available
FROM node:24-bookworm AS playwright
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["npx", "playwright", "test"]

FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Clean any existing node_modules and package-lock.json for fresh install
RUN rm -rf node_modules package-lock.json

# Reinstall dependencies
RUN npm install --legacy-peer-deps

# Run build to catch TypeScript/build errors early
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server
CMD ["npm", "run", "dev"]

