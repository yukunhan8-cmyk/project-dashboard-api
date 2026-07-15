# 腾讯云学生服务器部署指引

## 第1步：购买学生服务器

1. 打开腾讯云校园活动页：https://cloud.tencent.com/act/campus
2. 点击「学生认证」→ 用你的广州商学院学生信息认证
3. 认证成功后，选择「轻量应用服务器」：
   - 配置：2核2G（学生价约 ¥10/月）
   - 系统镜像：**Ubuntu 22.04**（不要选CentOS，Ubuntu更好用）
   - 地域：选「广州」或最近的城市（延迟最低）
4. 付款后等待1-2分钟，服务器自动创建

## 第2步：获取服务器信息

购买后在轻量应用服务器控制台可以看到：
- **公网IP**：如 `123.45.67.89`
- **默认密码**：在控制台重置一个你自己记得的密码
- 或者用「一键登录」直接进入服务器终端

## 第3步：SSH 登录服务器

```bash
# 在本地电脑打开终端（Windows用PowerShell或Git Bash）
ssh root@你的服务器IP

# 输入密码登录
```

如果提示「Are you sure you want to continue connecting?」输入 `yes`

## 第4步：一键部署

登录服务器后，逐条执行以下命令：

```bash
# 1. 安装 Docker
apt-get update && apt-get install -y docker.io docker-compose-plugin
systemctl start docker && systemctl enable docker

# 2. 创建项目目录
mkdir -p /root/project-dashboard-api && cd /root/project-dashboard-api

# 3. 上传项目文件（需要先在本地用scp上传）
# —— 这一步在本地电脑执行 ——
# scp -r /path/to/project-dashboard-api/* root@服务器IP:/root/project-dashboard-api/

# 4. 配置飞书密钥
cp .env.example .env
nano .env
# 修改 FEISHU_APP_SECRET=你的实际密钥
# 修改 CORS_ORIGIN=http://你的服务器IP
# 保存退出（Ctrl+X → Y → Enter）

# 5. 一键部署
bash deploy.sh
```

## 第5步：访问看板

部署完成后打开浏览器访问：
- 看板页面：`http://你的服务器IP/`
- API数据：`http://你的服务器IP/api/dashboard`

## 飞书Webhook配置（实现秒级实时同步）

1. 登录飞书开放平台 → https://open.feishu.cn
2. 你的应用 → 事件与回调 → 事件配置
3. 请求地址：`http://你的服务器IP/api/webhook/feishu`
4. 订阅事件：bitable.record.changed
5. 保存

## 简化方案（不用Docker）

如果2G内存跑Docker吃力，可以用更简单的方式：

```bash
# 安装 Node.js
apt-get install -y nodejs npm

# 安装 Nginx
apt-get install -y nginx

# 后端
cd /root/project-dashboard-api/backend
npm install
# 用 systemd 或 pm2 持久运行
npm install -g pm2
pm2 start src/index.js --name dashboard-backend
pm2 save && pm2 startup

# 前端（Nginx直接托管静态文件）
cp -r /root/project-dashboard-api/frontend/dist/* /var/www/html/
# 配置 Nginx 反向代理 /api → localhost:3000
```

## 常用运维命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 强制刷新数据
curl http://localhost/api/dashboard?force=1

# 更新项目代码后重新部署
docker compose up -d --build
```
