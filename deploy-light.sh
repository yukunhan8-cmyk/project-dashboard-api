#!/bin/bash
# ============================================
# 项目经营管理数据看板 — 轻量部署脚本（不用Docker）
# 适用于腾讯云学生服务器 2核2G
# ============================================

set -e

echo "============================================"
echo "  项目经营管理数据看板 — 轻量部署"
echo "  适用于 2核2G 腾讯云学生服务器"
echo "============================================"

# --- 检查系统 ---
if [ ! -f /etc/os-release ]; then
    echo "❌ 无法识别系统"
    exit 1
fi
. /etc/os-release
echo "✅ 系统: $ID $VERSION_ID"

# --- 安装 Node.js ---
echo ""
echo "📦 安装 Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# --- 安装 PM2（进程守护） ---
echo ""
echo "📦 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "✅ PM2: $(pm2 --version)"

# --- 安装 Nginx ---
echo ""
echo "📦 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi
echo "✅ Nginx: $(nginx --version 2>&1 | head -1)"

# --- 检查 .env ---
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件！"
    echo "请先创建：cp .env.example .env && nano .env"
    exit 1
fi

# --- 验证 .env ---
source .env
if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
    echo "❌ .env 中缺少飞书密钥！"
    exit 1
fi
echo "✅ .env 配置检查通过"

# --- 安装后端依赖 ---
echo ""
echo "📦 安装后端依赖..."
cd backend
npm install --production
cd ..
echo "✅ 后端依赖安装完成"

# --- 构建前端 ---
echo ""
echo "📦 构建前端..."
cd frontend
npm install
npx vite build
cd ..
echo "✅ 前端构建完成"

# --- 复制前端静态文件到 Nginx ---
echo ""
echo "📦 配置 Nginx..."
rm -rf /var/www/dashboard
mkdir -p /var/www/dashboard
cp -r frontend/dist/* /var/www/dashboard/

# --- 写入 Nginx 配置 ---
cat > /etc/nginx/sites-available/dashboard << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    root /var/www/dashboard;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 256;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSE 实时推送（长连接特殊配置）
    location /api/sse {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        chunked_transfer_encoding on;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF

# 启用配置
ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t
echo "✅ Nginx 配置完成"

# --- 启动后端 ---
echo ""
echo "🚀 启动后端服务..."
cd backend
pm2 delete dashboard-backend 2>/dev/null || true
pm2 start src/index.js --name dashboard-backend
pm2 save
pm2 startup
cd ..
echo "✅ 后端服务已启动（PM2守护）"

# --- 启动 Nginx ---
echo ""
systemctl restart nginx
systemctl enable nginx
echo "✅ Nginx 已启动"

# --- 验证 ---
echo ""
echo "⏳ 等待服务就绪..."
sleep 3

echo ""
echo "============================================"
echo "  🎉 部署完成！"
echo "============================================"

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/dashboard 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ 后端 API 正常 (HTTP $API_STATUS)"
else
    echo "⚠️  后端 API 可能需要几秒 (HTTP $API_STATUS)"
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端看板正常 (HTTP $FRONTEND_STATUS)"
else
    echo "⚠️  前端未就绪 (HTTP $FRONTEND_STATUS)"
fi

# 获取公网IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "未知")
echo ""
echo "============================================"
echo "  🌐 访问地址"
echo "============================================"
echo "  看板页面: http://$PUBLIC_IP/"
echo "  API 数据: http://$PUBLIC_IP/api/dashboard"
echo "  SSE 推送: http://$PUBLIC_IP/api/sse"
echo "  Webhook:  http://$PUBLIC_IP/api/webhook/feishu"
echo "============================================"

echo ""
echo "💡 常用命令："
echo "  查看后端日志: pm2 logs dashboard-backend"
echo "  重启后端:     pm2 restart dashboard-backend"
echo "  重启Nginx:    systemctl restart nginx"
echo "  强制刷新数据: curl http://localhost/api/dashboard?force=1"
echo "  更新前端:     cp -r frontend/dist/* /var/www/dashboard/"
