/**
 * 项目经营管理数据看板 - 后端API服务入口
 * Node.js + Express + SSE 实时推送
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const apiRoutes = require('./routes/api');
const feishu = require('./services/feishu');

const app = express();

// 全局SSE客户端列表
global.sseClients = [];

// 安全中间件
app.use(helmet());

// 请求日志
app.use(morgan('combined'));

// 跨域配置（支持多域名逗号分隔，或通配符 *）
const corsOrigins = config.corsOrigin.split(',').map(s => s.trim());
app.use(cors({
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 限流：每分钟最多120次请求（SSE不计入限流）
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  skip: (req) => req.path === '/api/sse', // SSE连接不计入限流
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});
app.use(limiter);

// 解析JSON（webhook需要）
app.use(express.json());

// API路由
app.use('/api', apiRoutes);

// 生产环境：后端直接托管前端静态文件（前后端同源，无需CORS）
if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1') {
  const path = require('path');
  const frontendDist = path.join(__dirname, '..', 'frontend_dist');
  
  // 静态文件
  app.use(express.static(frontendDist));
  
  // SPA fallback：所有非/api路径返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  
  console.log('[Static] 前端静态文件托管已启用，目录:', frontendDist);
}

// SSE 实时推送端点
app.get('/api/sse', (req, res) => {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx环境下禁用缓冲

  // 发送初始连接成功消息
  const initMsg = JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: 'SSE连接已建立，数据变更将自动推送',
  });
  res.write(`data: ${initMsg}\n\n`);

  // 保存客户端连接
  const client = { id: Date.now(), res };
  global.sseClients.push(client);

  // 定期发送心跳（每30秒），防止连接被代理/防火墙断开
  const heartbeatInterval = setInterval(() => {
    try {
      const heartbeat = JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() });
      res.write(`data: ${heartbeat}\n\n`);
    } catch (e) {
      clearInterval(heartbeatInterval);
      removeClient(client);
    }
  }, 30000);

  // 每30秒推送一次数据更新通知（推送前先清缓存，确保前端拿到飞书最新数据）
  const dataPushInterval = setInterval(() => {
    try {
      // 关键：推送前清缓存，否则前端重新请求时仍拿到旧的缓存数据
      feishu.clearCache();
      const dataPush = JSON.stringify({
        type: 'data-poll',
        timestamp: new Date().toISOString(),
        message: '缓存已清空，请重新获取飞书最新数据',
      });
      res.write(`data: ${dataPush}\n\n`);
      console.log('[SSE] 定期推送：缓存已清空，通知前端重新获取');
    } catch (e) {
      clearInterval(dataPushInterval);
      removeClient(client);
    }
  }, 30000);

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(dataPushInterval);
    removeClient(client);
  });
});

function removeClient(client) {
  const idx = global.sseClients.indexOf(client);
  if (idx !== -1) {
    global.sseClients.splice(idx, 1);
  }
  console.log(`[SSE] 客户端断开，当前连接数: ${global.sseClients.length}`);
}

// 开发环境根路径返回API信息（生产环境由SPA fallback返回前端页面）
if (process.env.NODE_ENV !== 'production' && process.env.SERVE_STATIC !== '1') {
  app.get('/', (req, res) => {
    res.json({
      name: '项目经营管理数据看板 API',
      version: '2.0.0',
      features: ['SSE实时推送', '飞书Webhook缓存刷新', '完整字段映射'],
      endpoints: [
        { method: 'GET', path: '/api/health', desc: '健康检查' },
        { method: 'GET', path: '/api/info', desc: 'API信息' },
        { method: 'GET', path: '/api/dashboard', desc: '看板汇总数据' },
        { method: 'GET', path: '/api/sse', desc: 'SSE实时推送连接' },
      ],
    });
  });
}

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  console.error(err.stack);

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? '服务器内部错误' : (err.message || '服务器内部错误'),
    // 生产环境不返回错误详情
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// 启动服务
app.listen(config.port, () => {
  console.log(`========================================`);
  console.log(`  项目经营管理数据看板 API v2.0 已启动`);
  console.log(`  监听端口: ${config.port}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  SSE: 已启用（/api/sse）`);
  console.log(`========================================`);
  console.log(`  飞书 App ID: ${config.feishu.appId ? '已配置' : '未配置'}`);
  console.log(`  多维表格 Token: ${config.bitable.appToken ? '已配置' : '未配置'}`);
  console.log(`========================================`);
});
