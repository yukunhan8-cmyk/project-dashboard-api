# 后端服务 Dockerfile（生产环境）
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force

# 复制源码（不复制 .env，密钥通过环境变量传入）
COPY src ./src

EXPOSE 3000

# 生产模式启动
CMD ["node", "src/index.js"]
