# Use Node base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm ci

# Build client if needed
RUN npm run build

# Optional: install bash for terminal access
RUN apt-get update && apt-get install -y bash

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
