# 🆓 免费部署指南 — 项目经营管理数据看板

## 方案对比

| 方案 | 配置 | 费用 | 优点 | 缺点 |
|------|------|------|------|------|
| **ClawCloud** (推荐) | 4核8GB | $5/月免费额度 | 配置最强、Docker一键部署 | 需GitHub账号180天+ |
| **Hugging Face Spaces** | 2核16GB | 完全免费 | 更强配置、真正永久免费 | 48小时无访问会休眠 |
| **Koyeb** | 0.1核512MB | 免费 | 无需GitHub180天 | 配置太弱，可能不够 |

---

## 🏆 方案一：ClawCloud（推荐）

### 资源估算（$5免费额度内）

| 项目 | 用量 | 费用/月 |
|------|------|---------|
| CPU | 0.5核 | $2.00 |
| 内存 | 1GB | $2.00 |
| 磁盘 | 5GB | $0.60 |
| 流量 | <1GB | ~$0.05 |
| **合计** | | **≈$4.65/月** ✅ 在免费额度内 |

### 操作步骤

#### Step 1：推送项目到 GitHub

1. 打开 https://github.com → New Repository → 名字 `project-dashboard-api`
2. 在本地 Git Bash 执行：

```bash
cd C:/Users/PC/Desktop/project-dashboard-api
git init
git add .
git commit -m "看板项目初始版本"
git remote add origin https://github.com/你的用户名/project-dashboard-api.git
git push -u origin main
```

#### Step 2：注册 ClawCloud

1. 打开 https://console.run.claw.cloud
2. 点击 **"Get started for free"**
3. 用 GitHub 账号登录（需注册超过180天才有每月$5额度）
4. 如果不满180天，注册后也有一次性$5额度，够用一个月

#### Step 3：创建应用

1. 进入控制台 → **App Launchpad**
2. 点击 **"Create App"**
3. 填写参数：
   - **应用名称**：`dashboard-app`
   - **部署区域**：**日本（Japan）** ← 国内访问最快
4. 点击 Deploy

#### Step 4：配置部署

1. 进入刚创建的应用 → **Configuration**
2. 设置 **镜像来源**：
   - 选择 **"GitHub"**
   - 连接你的 GitHub 账号
   - 选择 `project-dashboard-api` 仓库
   - 分支：`main`
   - Dockerfile 路径：`/Dockerfile`（自动检测）
3. 设置 **资源**：
   - CPU：0.5核
   - 内存：1GB
   - 磁盘：5GB
4. 设置 **环境变量**（关键！）：

```
FEISHU_APP_ID=cli_xxxxxxxxxx          ← 从飞书开放平台获取
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx ← 从飞书开放平台获取
BITABLE_APP_TOKEN=M0h6w56nLik7KxkXjBfcsUinnIf
TABLE_GMV_OVERVIEW=tbl0GI27Z8nI5pIi
TABLE_CHANNEL_OVERVIEW=tblR2zifznHivaFe
TABLE_FUNNEL=tblSq6QKQtLuKpzH
TABLE_LIVE_DATA=tbldnTOm50vlAVno
NODE_ENV=production
SERVE_STATIC=1
CACHE_TTL=30
CORS_ORIGIN=*
```

⚠️ **FEISHU_APP_SECRET 是最关键的**，去飞书开放平台 → 你的应用 → 凭证与基础信息 → App Secret

5. 设置 **网络**：
   - 开启 **"Public Network Access"**
   - 端口：**3000**
6. 点击 **Deploy**

#### Step 5：访问看板

部署完成后，ClawCloud 会分配一个公网地址，如：
`https://dashboard-app-xxxxx.run.claw.cloud`

打开这个地址就能看到看板了！

---

## 🥈 方案二：Hugging Face Spaces（完全免费，更强配置）

### 操作步骤

#### Step 1：注册 Hugging Face

1. 打开 https://huggingface.co → 注册账号（免费，无需信用卡）

#### Step 2：创建 Docker Space

1. 打开 https://huggingface.co/new-space
2. 填写：
   - **Space 名称**：`project-dashboard`
   - **License**：MIT
   - **SDK**：选择 **"Docker"**
3. 点击 Create Space

#### Step 3：推送项目到 Space

```bash
cd C:/Users/PC/Desktop/project-dashboard-api
git init
git add .
git commit -m "看板项目"

# 添加 Hugging Face 远程仓库
git remote add hf https://huggingface.co/spaces/你的用户名/project-dashboard
git push hf main
```

#### Step 4：配置环境变量

在 Space 页面 → **Settings** → **Repository Secrets** 添加：

```
FEISHU_APP_ID=cli_xxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
BITABLE_APP_TOKEN=M0h6w56nLik7KxkXjBfcsUinnIf
TABLE_GMV_OVERVIEW=tbl0GI27Z8nI5pIi
TABLE_CHANNEL_OVERVIEW=tblR2zifznHivaFe
TABLE_FUNNEL=tblSq6QKQtLuKpzH
TABLE_LIVE_DATA=tbldnTOm50vlAVno
NODE_ENV=production
SERVE_STATIC=1
```

#### Step 5：访问看板

地址：`https://你的用户名-project-dashboard.hf.space`

⚠️ **注意**：Hugging Face Spaces 48小时无人访问会自动休眠，首次访问需要等待约30秒唤醒。可以用免费定时ping服务（如 UptimeRobot）每5分钟访问一次来防止休眠。

---

## 🔗 配置飞书 Webhook（可选，实现秒级实时同步）

部署成功后，如果想要飞书一改数据、看板几秒内就更新：

1. 打开飞书开放平台 → 你的应用 → **事件订阅**
2. **请求地址**填写：`https://你的域名/api/webhook/feishu`
3. 订阅事件：选择 **多维表格记录变更** 相关事件
4. 保存后飞书会发送验证请求，后端已内置 challenge 验证逻辑

---

## 💡 省钱提醒

- ClawCloud 每月$5额度，看板项目约消耗$4.65，**刚好够用**
- 如果额度不够了，最便宜的付费方案是从 $5.50/月起
- Hugging Face 完全免费但会休眠，适合展示/演示用途
- 如果以后需要更稳定的服务，可以考虑腾讯云学生服务器（¥10/月）
