# 前端构建 Dockerfile（多阶段构建）
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

COPY . .
RUN npm run build

# 生产环境使用 nginx 托管
FROM nginx:alpine
# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf
# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
