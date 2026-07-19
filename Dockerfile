FROM node:18-alpine

WORKDIR /app

RUN npm init -y && npm install express cors @google-cloud/bigquery

COPY server.js .
COPY index.html ./public/index.html

EXPOSE 8080

CMD ["node", "server.js"]
