/**
 * 飞书开放平台 API 封装服务
 * 负责：获取 tenant_access_token、调用多维表格 API
 */

const axios = require('axios');
const config = require('../config');

class FeishuService {
  constructor() {
    this.baseUrl = config.feishu.baseUrl;
    this.appId = config.feishu.appId;
    this.appSecret = config.feishu.appSecret;
    this.appToken = config.bitable.appToken;
    this.token = null;
    this.tokenExpireTime = 0;

    // 内存缓存
    this.cache = new Map();
  }

  /**
   * 获取 tenant_access_token（自动缓存和刷新）
   */
  async getTenantAccessToken() {
    // Token 提前5分钟刷新
    if (this.token && Date.now() < this.tokenExpireTime - 5 * 60 * 1000) {
      return this.token;
    }

    const url = `${this.baseUrl}/auth/v3/tenant_access_token/internal`;
    const response = await axios.post(url, {
      app_id: this.appId,
      app_secret: this.appSecret,
    });

    const result = response.data;
    if (result.code !== 0) {
      throw new Error(`获取 tenant_access_token 失败: ${result.msg}`);
    }

    this.token = result.tenant_access_token;
    this.tokenExpireTime = Date.now() + result.expire * 1000;
    console.log('[Feishu] tenant_access_token 刷新成功');
    return this.token;
  }

  /**
   * 获取 API 请求头
   */
  async getHeaders() {
    const token = await this.getTenantAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 获取缓存键
   */
  getCacheKey(tableId, suffix = '') {
    return `table_${tableId}_${suffix}`;
  }

  /**
   * 获取缓存数据
   */
  getCached(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  /**
   * 设置缓存数据
   */
  setCache(key, data, ttlSeconds = config.cache.ttl) {
    this.cache.set(key, {
      data,
      expireAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * 列出数据表中的所有记录（自动分页）
   * @param {string} tableId - 数据表ID
   * @param {object} options - 选项 { viewId, filter, fieldNames }
   */
  async listAllRecords(tableId, options = {}) {
    const cacheKey = this.getCacheKey(tableId, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`[Cache] 命中 table ${tableId}`);
      return cached;
    }

    const headers = await this.getHeaders();
    const allRecords = [];
    let pageToken = null;

    do {
      const url = `${this.baseUrl}/bitable/v1/apps/${this.appToken}/tables/${tableId}/records/search`;
      const payload = {
        automatic_fields: false,
        page_size: 500, // 单次最大500条
      };

      if (options.viewId) payload.view_id = options.viewId;
      if (options.filter) payload.filter = options.filter;
      if (options.sort) payload.sort = options.sort;
      if (pageToken) payload.page_token = pageToken;
      if (options.field_names) payload.field_names = options.field_names;

      const response = await axios.post(url, payload, { headers });
      const result = response.data;

      if (result.code !== 0) {
        throw new Error(`查询记录失败 [${tableId}]: ${result.msg}`);
      }

      const items = result.data?.items || [];
      allRecords.push(...items);
      pageToken = result.data?.page_token;

      console.log(`[Feishu] table ${tableId} 获取 ${items.length} 条，累计 ${allRecords.length} 条`);
    } while (pageToken);

    // 转换为更友好的格式
    const formatted = allRecords.map(item => ({
      recordId: item.record_id,
      ...item.fields,
    }));

    this.setCache(cacheKey, formatted);
    return formatted;
  }

  /**
   * 获取单条记录
   */
  async getRecord(tableId, recordId) {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}/bitable/v1/apps/${this.appToken}/tables/${tableId}/records/${recordId}`;
    const response = await axios.get(url, { headers });
    const result = response.data;

    if (result.code !== 0) {
      throw new Error(`获取记录失败: ${result.msg}`);
    }

    return {
      recordId: result.data.record.record_id,
      ...result.data.record.fields,
    };
  }

  /**
   * 列出数据表信息
   */
  async listTables() {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}/bitable/v1/apps/${this.appToken}/tables`;
    const response = await axios.get(url, { headers });
    const result = response.data;

    if (result.code !== 0) {
      throw new Error(`获取数据表列表失败: ${result.msg}`);
    }

    return result.data?.items || [];
  }

  /**
   * 列出字段信息
   */
  async listFields(tableId) {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}/bitable/v1/apps/${this.appToken}/tables/${tableId}/fields`;
    const response = await axios.get(url, { headers });
    const result = response.data;

    if (result.code !== 0) {
      throw new Error(`获取字段列表失败: ${result.msg}`);
    }

    return result.data?.items || [];
  }

  /**
   * 清空缓存（可在外部调用刷新数据）
   */
  clearCache() {
    this.cache.clear();
    console.log('[Cache] 缓存已清空');
  }
}

module.exports = new FeishuService();
