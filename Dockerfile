FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway injects PORT automatically — server.js already reads process.env.PORT
EXPOSE 8080

CMD ["node", "src/server.js"]
