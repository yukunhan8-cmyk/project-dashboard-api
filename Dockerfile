# === 单容器部署：前端 + 后端一体 ===
# 构建: docker build -t dashboard-app .
# 运行: docker run -d -p 80:3000 --env-file .env dashboard-app

# ---- 阶段1：构建前端 ----
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 阶段2：构建后端 + 合成 ----
FROM node:22-alpine

WORKDIR /app

# 安装后端依赖
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# 复制后端源码
COPY backend/src/ ./src/

# 复制前端构建产物到后端的 frontend_dist 目录
COPY --from=frontend-builder /build/frontend/dist ./frontend_dist/

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
