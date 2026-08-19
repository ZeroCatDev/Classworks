FROM node:22-alpine

WORKDIR /app

# Set production environment by default
ENV NODE_ENV=production

COPY . .

# Install dependencies
RUN npm install

# Copy all application files


# Make the management script executable
RUN chmod +x classworks.js

EXPOSE 3000

# Use the management script as entrypoint
ENTRYPOINT ["node", "classworks.js"]

# Default command (can be overridden)
CMD []