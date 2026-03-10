FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

# The actual command is provided by docker-compose:
# - server: npm run dev
# - worker: npm run worker
CMD ["npm", "run", "dev"]

