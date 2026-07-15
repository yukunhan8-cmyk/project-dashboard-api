#!/bin/bash
# ============================================
# 项目经营管理数据看板 — 一键部署脚本
# ============================================
# 使用方法：
#   1. 把整个项目上传到服务器（或 git clone）
#   2. 在项目根目录创建 .env 文件，填入飞书密钥
#   3. 运行: bash deploy.sh
# ============================================

set -e

echo "============================================"
echo "  项目经营管理数据看板 — 部署开始"
echo "============================================"

# --- 检查 Docker ---
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker 未安装，正在安装..."
    # 根据系统选择安装方式
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian)
                apt-get update && apt-get install -y docker.io docker-compose-plugin
                ;;
            centos|rhel|amzn)
                yum install -y docker docker-compose-plugin
                ;;
            *)
                echo "❌ 不支持的系统: $ID，请手动安装 Docker"
                exit 1
                ;;
        esac
    else
        echo "❌ 无法识别系统，请手动安装 Docker"
        exit 1
    fi
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 安装完成"
else
    echo "✅ Docker 已安装: $(docker --version)"
fi

# --- 检查 docker compose ---
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "⚠️  Docker Compose 未安装，正在安装..."
    apt-get update && apt-get install -y docker-compose-plugin || yum install -y docker-compose-plugin
    COMPOSE_CMD="docker compose"
fi
echo "✅ Docker Compose: $COMPOSE_CMD"

# --- 检查 .env ---
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件！"
    echo "请先创建 .env 文件并填入飞书密钥："
    echo ""
    echo "  cp .env.example .env"
    echo "  nano .env   # 编辑填入 FEISHU_APP_SECRET"
    echo ""
    echo "必填项："
    echo "  FEISHU_APP_ID=cli_xxxxxx"
    echo "  FEISHU_APP_SECRET=xxxxxx"
    echo "  BITABLE_APP_TOKEN=M0h6w56nLik7KxkXjBfcsUinnIf"
    echo "  CORS_ORIGIN=http://你的域名或IP"
    echo ""
    exit 1
fi

# --- 验证 .env 必填项 ---
source .env
if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
    echo "❌ .env 中缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET！"
    exit 1
fi
echo "✅ .env 配置检查通过"

# --- 构建前端 ---
echo ""
echo "📦 构建前端生产版本..."
cd frontend
npm install --production=false
npx vite build
cd ..
echo "✅ 前端构建完成"

# --- 启动 Docker ---
echo ""
echo "🚀 启动 Docker Compose..."
$COMPOSE_CMD up -d --build
echo "✅ 服务启动完成"

# --- 等待服务就绪 ---
echo ""
echo "⏳ 等待后端启动..."
sleep 5

# --- 检查服务状态 ---
echo ""
echo "============================================"
echo "  部署完成！服务状态检查"
echo "============================================"

# 检查后端 API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/dashboard 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ 后端 API 正常 (HTTP $API_STATUS)"
else
    echo "⚠️  后端 API 未就绪 (HTTP $API_STATUS)，可能需要等待几秒"
fi

# 检查前端
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端看板正常 (HTTP $FRONTEND_STATUS)"
else
    echo "⚠️  前端未就绪 (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "============================================"
echo "  🎉 访问地址"
echo "============================================"
echo "  看板页面: http://你的服务器IP/"
echo "  API 数据: http://你的服务器IP/api/dashboard"
echo "  SSE 推送: http://你的服务器IP/api/sse"
echo "  Webhook:  http://你的服务器IP/api/webhook/feishu"
echo ""
echo "  飞书 Webhook 配置: 把上面的 Webhook URL 配到飞书开放平台事件订阅"
echo "============================================"

# --- 显示容器状态 ---
echo ""
$COMPOSE_CMD ps

echo ""
echo "💡 常用命令："
echo "  查看日志: $COMPOSE_CMD logs -f"
echo "  停止服务: $COMPOSE_CMD down"
echo "  重启服务: $COMPOSE_CMD restart"
echo "  强制刷新: curl http://localhost/api/dashboard?force=1"
