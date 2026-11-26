
FROM node:22-bookworm

WORKDIR /app

# Install GCC and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY package.json ./
RUN npm install

# Copy project files
COPY . .

# Build React frontend
RUN npm run build

# Render provides its own PORT
ENV NODE_ENV=production

EXPOSE 3000

# Start Express server and C backend
CMD ["npm", "start"]
