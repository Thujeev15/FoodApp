# Node.js backend image for Fly.io
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads

ENV PORT=5001
EXPOSE 5001

CMD ["node", "server.js"]
