#!/bin/bash
# sync.sh — 从飞书获取最新数据并更新公网看板数据文件
cd /c/Users/PC/Desktop/project-dashboard-api

# 检查后端是否在运行
if ! curl -s http://localhost:3000/api/dashboard > /dev/null 2>&1; then
  echo "后端未运行，正在启动..."
  cd backend && node src/index.js &
  sleep 4
  cd ..
fi

# 强制刷新数据（force=1 跳过缓存，直接从飞书拉取）
HTTP_CODE=$(curl -s -w "%{http_code}" "http://localhost:3000/api/dashboard?force=1" -o public-preview/data.json)

if [ "$HTTP_CODE" = "200" ] && [ -s public-preview/data.json ]; then
  echo "SYNC_SUCCESS: 数据已更新 ($(date '+%Y-%m-%d %H:%M:%S'))"
else
  echo "SYNC_FAILED: HTTP $HTTP_CODE"
  exit 1
fi
