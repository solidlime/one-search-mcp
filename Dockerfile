# Use Playwright's official image which includes Chromium and all required dependencies
# This supports the local search provider with agent-browser
FROM mcr.microsoft.com/playwright:v1.58.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies needed for build)
# Note: Playwright browsers are already installed in the base image
RUN npm ci

# Copy remaining source code
COPY . .

# Build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set environment variables
# Default to local search provider (uses agent-browser with Chromium)
ENV SEARCH_PROVIDER=local
ENV NODE_ENV=production
ENV PORT=8000

# Expose port for Streamable HTTP transport
EXPOSE 8000

# Run as non-root user for security
USER pwuser

# Command to run the MCP server in Streamable HTTP mode
# To run with stdio instead, override CMD: docker run <image> node dist/index.js
CMD ["node", "dist/index.js", "streamable-http", "--port=8000"]
