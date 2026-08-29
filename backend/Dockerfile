FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY src/ ./src/
COPY .env.example .env

RUN mkdir -p /app/database

EXPOSE 3001

CMD ["node", "src/server.js"]
