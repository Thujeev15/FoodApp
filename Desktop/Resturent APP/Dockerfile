# Backend image built from the repository root
FROM node:18-alpine

WORKDIR /usr/src/app

COPY Backend/package*.json ./

RUN npm install --omit=dev

COPY Backend/ .

RUN mkdir -p uploads

EXPOSE 5001

CMD ["npm", "start"]