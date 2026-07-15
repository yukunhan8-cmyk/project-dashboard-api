#!/bin/bash
# 打包项目文件，排除不必要的文件，方便上传到服务器
# 在本地 Git Bash 执行此脚本

cd "$(dirname "$0")"

echo "📦 打包项目文件..."

tar czf project-dashboard-api-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.workbuddy' \
  --exclude='frontend/dist' \
  --exclude='frontend/node_modules' \
  --exclude='backend/node_modules' \
  --exclude='*.log' \
  --exclude='debug*.js' \
  --exclude='DEPLOY_GUIDE.md' \
  --exclude='项目经营管理系统-多维表格开发文档.md' \
  backend/ \
  frontend/ \
  docker-compose.yml \
  deploy.sh \
  deploy-light.sh \
  .env.example \
  .gitignore \
  README.md \
  DEPLOY_TENCENT.md

echo "✅ 打包完成: project-dashboard-api-deploy.tar.gz"
echo ""
echo "文件大小: $(ls -lh project-dashboard-api-deploy.tar.gz | awk '{print $5}')"
echo ""
echo "下一步操作："
echo "  1. 腾讯云购买学生服务器（Ubuntu 22.04）"
echo "  2. 上传到服务器："
echo "     scp project-dashboard-api-deploy.tar.gz root@服务器IP:/root/"
echo "  3. SSH登录服务器："
echo "     ssh root@服务器IP"
echo "  4. 解压并部署："
echo "     cd /root"
echo "     tar xzf project-dashboard-api-deploy.tar.gz"
echo "     cd project-dashboard-api"
echo "     cp .env.example .env"
echo "     nano .env   # 填入飞书密钥和服务器IP"
echo "     bash deploy-light.sh"
