FROM node:18-alpine

WORKDIR /app

# 静的ファイルを提供するシンプルな Node.js サーバー
RUN npm init -y && npm install express cors

COPY dashboard.html ./public/index.html

EXPOSE 8080

CMD ["node", "server.js"]
