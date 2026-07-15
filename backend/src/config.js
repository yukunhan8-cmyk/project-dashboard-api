// 配置文件
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  // CORS：支持多个域名（逗号分隔），生产环境需包含实际域名
  // Docker/Nginx部署时前端和API同源，CORS不是必须的
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // 飞书开放平台配置
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    baseUrl: 'https://open.feishu.cn/open-apis',
  },

  // 多维表格配置
  bitable: {
    appToken: process.env.BITABLE_APP_TOKEN,      // 多维表格 app_token
    tableIds: {
      gmvOverview: process.env.TABLE_GMV_OVERVIEW || 'tbl0GI27Z8nI5pIi',      // 项目GMV总览表
      channelOverview: process.env.TABLE_CHANNEL_OVERVIEW || '',               // 项目渠道总览表
      funnel: process.env.TABLE_FUNNEL || '',                                  // 渠道漏斗表
      liveData: process.env.TABLE_LIVE_DATA || '',                             // 直播数据表
    }
  },

  // 缓存配置（秒） — 30秒配合SSE 30秒推送周期，确保数据新鲜度
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '30'), // 默认30秒，SSE推送前会主动清缓存
  }
};

module.exports = config;
