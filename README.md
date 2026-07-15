# 项目经营管理数据看板 — 完整搭建指南

基于飞书多维表格 + 自建中转 API + React 前端的数据可视化看板系统。

---

## 目录

1. [架构概览](#一架构概览)
2. [Step 1：飞书开放平台配置](#二step-1飞书开放平台配置)
3. [Step 2：后端API服务搭建](#三step-2后端api服务搭建)
4. [Step 3：前端看板搭建](#四step-3前端看板搭建)
5. [Step 4：数据表ID配置](#五step-4数据表id配置)
6. [Step 5：部署上线](#六step-5部署上线)
7. [API接口文档](#七api接口文档)
8. [常见问题](#八常见问题)

---

## 一、架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
│                   (React + ECharts)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│                   Nginx (前端静态托管)                        │
│                     localhost:80                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ /api/* 代理
┌─────────────────────────▼───────────────────────────────────┐
│              Node.js + Express (后端API)                    │
│                    localhost:3000                            │
│  - 自动获取 tenant_access_token                             │
│  - 内存缓存（默认5分钟）                                     │
│  - 数据清洗 + 聚合计算                                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│              飞书开放平台 API                                │
│         open.feishu.cn/open-apis/bitable/v1                │
│              读取多维表格数据                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Step 1：飞书开放平台配置

### 2.1 创建企业自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 点击 **「创建企业自建应用」**
3. 填写应用名称（如：数据看板服务）、描述、图标
4. 创建完成后进入应用详情页

### 2.2 获取凭证

进入 **「凭证与基础信息」**：
- 复制 `App ID`（如：`cli_xxxxxxxxxxxx`）
- 复制 `App Secret`（如：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 2.3 申请API权限

进入 **「权限管理」**，申请以下权限：

| 权限名称 | 权限代码 | 说明 |
|---------|---------|------|
| 查看多维表格 | `bitable:app` | 读取多维表格元数据 |
| 读取记录 | `bitable:record` | 读取表格记录数据 |
| 读取字段 | `bitable:field` | 读取表格字段信息 |

> 点击 **「申请权限」** → 选择权限 → **「批量申请」** → 等待管理员审批通过

### 2.4 发布应用

进入 **「版本管理与发布」**：
1. 点击 **「创建版本」**
2. 填写版本号（如 `1.0.0`）、更新说明
3. 点击 **「保存」** → **「申请发布」**
4. 联系企业管理员审批通过

---

## 三、Step 2：后端API服务搭建

### 3.1 安装依赖

```bash
cd backend
npm install
```

### 3.2 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITABLE_APP_TOKEN=B9cPbd7zHaOAC5soJibcuQf9nYc
TABLE_GMV_OVERVIEW=tbl0GI27Z8nI5pIi
TABLE_CHANNEL_OVERVIEW=            # 待填写
TABLE_FUNNEL=                        # 待填写
TABLE_LIVE_DATA=                     # 待填写
PORT=3000
CORS_ORIGIN=http://localhost:5173
CACHE_TTL=300
```

### 3.3 启动服务

**开发模式（热重载）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

启动成功后访问 `http://localhost:3000`，应看到 API 文档页面。

### 3.4 验证API

```bash
# 健康检查
curl http://localhost:3000/api/health

# 获取数据表列表（用于确认table_id）
curl http://localhost:3000/api/tables

# 获取看板汇总数据
curl http://localhost:3000/api/dashboard
```

---

## 四、Step 3：前端看板搭建

### 4.1 安装依赖

```bash
cd frontend
npm install
```

### 4.2 开发模式启动

```bash
npm run dev
```

访问 `http://localhost:5173` 即可看到看板。

> 开发模式下，前端代理 `/api` 请求到 `localhost:3000`，无需处理跨域。

### 4.3 构建生产包

```bash
npm run build
```

构建产物位于 `frontend/dist/` 目录。

---

## 五、Step 4：数据表ID配置

你的多维表格 URL 格式：
```
https://vcnhpqcze15y.feishu.cn/wiki/M0h6w56nLik7KxkXjBfcsUinnIf?table=tbl0GI27Z8nI5pIi&view=vewhn6Yu86
```

### 方法1：从URL直接获取

| 参数 | 说明 |
|------|------|
| `app_token` | URL 中 `wiki/` 后的部分：`M0h6w56nLik7KxkXjBfcsUinnIf` |
| `table_id` | URL 中 `table=` 后的部分：`tbl0GI27Z8nI5pIi` |

### 方法2：通过API查询（推荐）

启动后端后访问：
```bash
curl http://localhost:3000/api/tables
```

返回：
```json
{
  "success": true,
  "data": [
    { "tableId": "tbl0GI27Z8nI5pIi", "name": "项目GMV总览表" },
    { "tableId": "tblXXXXX", "name": "项目渠道总览表" },
    { "tableId": "tblYYYYY", "name": "渠道漏斗表" },
    { "tableId": "tblZZZZZ", "name": "直播数据表" }
  ]
}
```

将对应的 `tableId` 填入 `.env` 的各 `TABLE_*` 配置项。

---

## 六、Step 5：部署上线

### 方案A：Docker Compose 一键部署（推荐）

#### 1. 准备环境变量文件

在项目根目录创建 `.env`（从 `.env.example` 复制）：

```bash
cp .env.example .env
```

编辑 `.env` 填入飞书密钥：

```env
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITABLE_APP_TOKEN=M0h6w56nLik7KxkXjBfcsUinnIf
TABLE_GMV_OVERVIEW=tbl0GI27Z8nI5pIi
TABLE_CHANNEL_OVERVIEW=tblR2zifznHivaFe
TABLE_FUNNEL=tblSq6QKQtLuKpzH
TABLE_LIVE_DATA=tbldnTOm50vlAVno
```

> ⚠️ `.env` 包含飞书密钥，**绝对不能提交到 Git**！已在 `.gitignore` 中排除。

#### 2. 构建并启动

```bash
docker-compose up -d --build
```

#### 3. 访问

- 看板页面：`http://服务器IP`
- API服务：`http://服务器IP/api/health`
- SSE连接：`http://服务器IP/api/sse`

#### 4. 查看日志

```bash
# 后端日志
docker logs -f dashboard-backend

# 前端日志
docker logs -f dashboard-frontend
```

#### 5. 停止服务

```bash
docker-compose down
```

### 方案B：手动部署（云服务器）

#### 后端部署

```bash
cd backend
npm install --production
cp .env.example .env
# 编辑 .env 填入配置
npm start
```

使用 PM2 守护进程：
```bash
npm install -g pm2
pm2 start src/index.js --name dashboard-backend
pm2 save
pm2 startup
```

#### 前端部署

```bash
cd frontend
npm install
npm run build
```

将 `dist/` 目录部署到 Nginx / CDN / OSS：

```nginx
server {
    listen 80;
    root /var/www/dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

### 方案C：Serverless 部署

#### Vercel（前端）

```bash
cd frontend
npm install -g vercel
vercel --prod
```

#### Vercel Serverless Functions（后端）

将 `backend/src/routes/api.js` 适配为 Vercel API Route（`api/dashboard.js`），使用 `@larksuiteoapi/node-sdk` SDK 调用飞书 API。

---

## 七、API接口文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/tables` | 获取多维表格中的所有数据表 |
| GET | `/projects` | 项目GMV总览数据 |
| GET | `/channels` | 项目渠道总览数据（含汇总指标） |
| GET | `/funnels` | 渠道漏斗数据（含聚合分析） |
| GET | `/live-sessions` | 直播数据明细 |
| GET | `/dashboard` | 看板汇总数据（合并所有表） |
| POST | `/refresh-cache` | 手动清空缓存 |

### 返回格式

所有接口统一返回：

```json
{
  "success": true,
  "data": {},
  "summary": {},      // 部分接口包含汇总指标
  "count": 0          // 部分接口包含记录数
}
```

错误返回：

```json
{
  "success": false,
  "message": "错误描述"
}
```

### 示例：获取看板数据

```bash
curl http://localhost:3000/api/dashboard
```

返回：

```json
{
  "success": true,
  "kpi": {
    "totalGmv": 527000,
    "totalOrders": 192,
    "projectCount": 17,
    "avgRoi": 2.1
  },
  "projects": [...],
  "channels": [...],
  "funnels": [...],
  "liveSessions": [...]
}
```

---

## 八、常见问题

### Q1：获取 token 失败，提示 "app not found"

**原因**：App ID 或 App Secret 填错了。  
**解决**：检查 `.env` 中的 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`，确保是「企业自建应用」而非「应用商店应用」。

### Q2：调用API返回 "forbidden" 或权限不足

**原因**：应用没有获得多维表格的访问权限。  
**解决**：
1. 确保在「权限管理」中申请了 `bitable:app`、`bitable:record` 权限
2. 确保应用已发布并通过管理员审批
3. 确保应用已添加为多维表格的协作者（打开多维表格 → 分享 → 添加协作者 → 搜索应用名称）

### Q3：返回数据为空

**原因**：table_id 配置错误或该表无数据。  
**解决**：
1. 访问 `/api/tables` 确认 table_id 与表名对应关系
2. 检查多维表格中对应表是否有数据

### Q4：前端请求API报跨域错误

**原因**：前端和后端域名/端口不一致。  
**解决**：
- 开发模式：前端 `vite.config.js` 已配置 proxy，无需处理
- 生产模式：确保后端 `CORS_ORIGIN` 包含前端域名，或前端通过同源Nginx代理 `/api`

### Q5：如何自动定时刷新数据？

看板前端已内置每5分钟自动刷新。如需调整：

```javascript
// frontend/src/App.jsx
const interval = setInterval(fetchData, 5 * 60 * 1000); // 改为所需间隔
```

如需后端定时主动推送，可使用飞书 Webhook 或定时任务（cron）。

### Q6：如何提升数据安全性？

1. **添加API鉴权**：在 `backend/src/index.js` 中添加 JWT / API Key 校验中间件
2. **HTTPS**：生产环境强制使用 HTTPS
3. **IP白名单**：限制飞书API回调IP
4. **敏感信息加密**：将 `.env` 中的密钥存入密钥管理系统（如 AWS Secrets Manager）

---

## 项目结构

```
project-dashboard-api/
├── README.md                    # 本文件
├── docker-compose.yml           # Docker编排
├── .env                         # 环境变量（不提交到Git）
├── backend/                     # 后端API服务
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js             # 服务入口
│       ├── config.js            # 配置管理
│       ├── routes/
│       │   └── api.js           # API路由
│       └── services/
│           └── feishu.js        # 飞书API封装
└── frontend/                    # 前端看板
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── KpiCards.jsx     # KPI指标卡片
        │   ├── GmvChart.jsx     # GMV对比柱状图
        │   ├── ChannelChart.jsx # 渠道分布环形图
        │   ├── FunnelChart.jsx  # 漏斗分析图
        │   ├── ProjectTable.jsx # 项目表格
        │   └── LiveTable.jsx    # 直播数据表格
        └── styles/
            └── index.css        # 全局样式
```

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端 | Node.js + Express | 20.x |
| 前端 | React + Vite | 18.x |
| 图表 | ECharts | 5.5.x |
| HTTP | Axios | 1.7.x |
| 部署 | Docker + Docker Compose | - |
| 数据源 | 飞书多维表格 API | v1 |

---

如有问题，请检查：
1. 飞书应用权限是否已审批
2. 多维表格是否已将应用添加为协作者
3. `.env` 中的 `app_token` 和 `table_id` 是否正确
