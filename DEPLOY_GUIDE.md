# 项目经营管理数据看板 — 公网部署指引

## 一、服务器采购推荐

### 最省钱方案（适合个人项目）

| 平台 | 配置 | 月费 | 推荐理由 |
|------|------|------|----------|
| **腾讯云轻量应用服务器** | 2核2G 50GB | ~¥50/月 | 国内最稳，自带Docker镜像 |
| **阿里云 ECS 经济型** | 2核2G | ~¥55/月 | 生态完善 |
| **Vultr** | 1核1G | ~$6/月 | 海外项目可选 |

**推荐：腾讯云轻量应用服务器（最便宜、国内访问快）**

购买链接：https://cloud.tencent.com/product/lighthouse
- 选「系统镜像」→ Ubuntu 22.04 或 CentOS 8
- 2核2G 足够运行这个看板
- 选择 Docker 应用镜像可以省去安装步骤

---

## 二、部署步骤（3步上线）

### Step 1：购买服务器后 SSH 登录

```bash
ssh root@你的服务器IP
```

### Step 2：上传项目 + 配置密钥

**方式A：用 Git（推荐）**
```bash
# 先在 GitHub/Gitee 创建仓库，本地推送
cd project-dashboard-api
git init
git add .
git commit -m "项目经营管理看板"
git remote add origin https://github.com/你的用户名/project-dashboard-api.git
git push -u origin main

# 服务器上克隆
git clone https://github.com/你的用户名/project-dashboard-api.git
cd project-dashboard-api
```

**方式B：用 SCP 直接上传**
```bash
# 本地打包
cd project-dashboard-api
tar czf project-dashboard-api.tar.gz \
  --exclude=node_modules \
  --exclude=.env \
  --exclude=dist \
  backend/ frontend/ docker-compose.yml deploy.sh .env.example README.md

# 上传到服务器
scp project-dashboard-api.tar.gz root@服务器IP:/root/

# 服务器上解压
ssh root@服务器IP
cd /root
tar xzf project-dashboard-api.tar.gz
cd project-dashboard-api
```

### Step 3：配置密钥 + 一键部署

```bash
# 创建 .env 文件，填入飞书密钥
cp .env.example .env
nano .env   # 或用 vim .env

# 必填项：
# FEISHU_APP_ID=cli_xxxxxxxx        ← 飞书开放平台获取
# FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx ← 飞书开放平台获取
# BITABLE_APP_TOKEN=M0h6w56nLik7KxkXjBfcsUinnIf
# CORS_ORIGIN=http://你的服务器IP

# 一键部署
bash deploy.sh
```

部署完成后访问 `http://服务器IP/` 即可看到看板！

---

## 三、飞书 Webhook 配置（秒级实时同步）

部署上线后，配置飞书 Webhook 实现飞书表格一改动、看板几秒内自动更新：

1. 登录飞书开放平台 → https://open.feishu.cn
2. 找到你的应用 → 事件与回调 → 事件配置
3. 请求地址填写：`http://你的服务器IP/api/webhook/feishu`
4. 订阅事件：`bitable.record.changed`（多维表格记录变更）
5. 保存后飞书会发送 challenge 验证，后端会自动响应

---

## 四、域名配置（可选）

如果想用自定义域名（如 `dashboard.yourdomain.com`）：

1. 在域名服务商添加 A 记录 → 指向服务器IP
2. 修改 `.env` 中的 `CORS_ORIGIN=http://dashboard.yourdomain.com`
3. 修改 `frontend/nginx.conf` 中的 `server_name`
4. 重启服务：`docker compose restart`

---

## 五、常见问题

### Q: 页面打开但数据为空？
检查 `.env` 中飞书密钥是否正确，运行：
```bash
curl http://localhost:3000/api/dashboard?force=1
```

### Q: Docker 安装失败？
```bash
# Ubuntu
apt-get update && apt-get install -y docker.io docker-compose-plugin
systemctl start docker && systemctl enable docker

# CentOS
yum install -y docker docker-compose-plugin
systemctl start docker && systemctl enable docker
```

### Q: 端口 80 被占用？
修改 `docker-compose.yml` 中前端的 ports 映射：
```yaml
ports:
  - "8080:80"   # 改用 8080 端口
```

### Q: 查看日志排查问题？
```bash
docker compose logs -f          # 查看所有日志
docker compose logs -f backend  # 只看后端
docker compose logs -f frontend # 只看前端(Nginx)
```
