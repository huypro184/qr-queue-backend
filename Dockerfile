FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S qrqueue -u 1001 && \
    chown -R qrqueue:nodejs /app

USER qrqueue

EXPOSE 3000

CMD ["npm", "start"]