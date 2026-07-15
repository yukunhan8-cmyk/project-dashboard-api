/**
 * API 路由
 * 提供看板所需的全部数据接口
 * 基于多维表格开发文档完整暴露所有字段
 */

const express = require('express');
const router = express.Router();
const feishu = require('../services/feishu');
const config = require('../config');

/**
 * 解析飞书文本类型的金额字段（如 "¥527000" 或 "527000" 或富文本数组）
 * 返回纯数字
 */
function parseGmvText(value) {
  if (value == null || value === '') return 0;
  // 富文本数组格式
  if (Array.isArray(value)) {
    const text = value.map(item => item.text || '').join('');
    return parseGmvString(text);
  }
  // 对象格式
  if (typeof value === 'object' && value.text) {
    return parseGmvString(value.text);
  }
  if (typeof value === 'object' && Array.isArray(value.value)) {
    const text = value.value.map(item => item.text || '').join('');
    return parseGmvString(text);
  }
  return parseGmvString(String(value));
}

function parseGmvString(str) {
  // 移除 ¥、￥、逗号、空格等
  const cleaned = str.replace(/[¥￥,\s]/g, '').replace(/万/g, '0000');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * 解析飞书百分比文本（如 "45%" 或 "0.45"）
 * 返回0-1之间的小数
 */
function parsePercentText(value) {
  if (value == null || value === '') return 0;
  const str = String(value).replace(/[¥￥,\s]/g, '');
  if (str.endsWith('%')) {
    return parseFloat(str.replace('%', '')) / 100;
  }
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  // 如果数值 > 1，说明是百分比形式（如45），需要除以100
  return num > 1 ? num / 100 : num;
}

/**
 * 解析飞书公式/lookup字段（可能返回数组或复杂对象）
 */
function parseAutoField(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    // lookup字段通常返回数组，取第一个元素
    if (value.length === 0) return null;
    const first = value[0];
    if (typeof first === 'object' && first.text) return first.text;
    return first;
  }
  if (typeof value === 'object') {
    if (value.text) return value.text;
    if (Array.isArray(value.value)) {
      return value.value.map(item => item.text || '').join('');
    }
    return JSON.stringify(value);
  }
  return value;
}

/**
 * 安全解析数字
 */
function safeNum(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const num = parseFloat(String(value));
  return isNaN(num) ? fallback : num;
}

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 获取数据表列表（方便调试时查看表ID）
 */
router.get('/tables', async (req, res, next) => {
  try {
    const tables = await feishu.listTables();
    res.json({
      success: true,
      data: tables.map(t => ({
        tableId: t.table_id,
        name: t.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取项目GMV总览数据（完整27个字段）
 * GET /api/projects
 */
router.get('/projects', async (req, res, next) => {
  try {
    const tableId = config.bitable.tableIds.gmvOverview;
    const records = await feishu.listAllRecords(tableId);

    const cleaned = records
      .filter(r => r['项目ID'])
      .map(r => ({
        // 基本信息
        projectId: parseAutoField(r['项目ID']) || '',
        projectType: r['项目类型'] || '',
        projectStatus: r['项目状态'] || '',
        deadline: r['截止日期'] || null,
        remainingDays: parseAutoField(r['剩余日期']) || '',

        // GMV指标（text类型需特殊解析）
        orderGmv: parseGmvText(r['下单GMV（含未付）']),
        paidGmv: parseGmvText(r['支付GMV（已支付）']),
        refundGmv: parseGmvText(r['退款GMV']),
        netGmv: parseGmvText(r['净GMV']),
        targetGmv: safeNum(r['目标总GMV']),

        // 流量指标
        totalExposure: safeNum(r['总曝光量']),
        clickCount: safeNum(r['点击人数']),
        orderCount: safeNum(parseAutoField(r['下单人数'])),
        avgOrderValue: parseGmvText(r['客单价']), // 客单价也可能是text

        // GMV渠道占比
        liveGmvRatio: parsePercentText(r['直播GMV占比'] || r['直播间GMV 占比']),
        shortVideoGmv: parseGmvText(r['短视频GMV']),
        shortVideoGmvRatio: parsePercentText(r['短视频GMV 占比'] || r['短视频GMV占比']),
        productCardGmv: parseGmvText(r['商品卡GMV']),
        productCardGmvRatio: parsePercentText(r['商品卡GMV 占比'] || r['商品卡GMV占比']),
        showcaseGmv: parseGmvText(r['橱窗GMV']),
        showcaseGmvRatio: parsePercentText(r['橱窗GMV 占比'] || r['橱窗GMV占比']),

        // 直播关联指标（lookup/formula字段）
        totalLiveGmv: parseGmvText(parseAutoField(r['累计直播GMV'])),
        totalLiveSessions: safeNum(parseAutoField(r['总直播场次']), 0),
        avgLiveViewers: safeNum(parseAutoField(r['场均观看人数']), 0),
        liveGmvRatioAuto: parsePercentText(parseAutoField(r['直播GMV占比'])),
        liveCompletionRate: parsePercentText(parseAutoField(r['项目直播完成率'])),
      }));

    res.json({ success: true, count: cleaned.length, data: cleaned });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取项目渠道总览数据（完整14个字段）
 * GET /api/channels
 */
router.get('/channels', async (req, res, next) => {
  try {
    const tableId = config.bitable.tableIds.channelOverview;
    const records = await feishu.listAllRecords(tableId);

    const cleaned = records.map(r => ({
      projectId: parseAutoField(r['项目ID']) || '',
      // 渠道GMV（text类型）
      liveGmv: parseGmvText(r['直播间GMV']),
      liveGmvRatio: parsePercentText(r['直播间GMV 占比']),
      shortVideoGmv: parseGmvText(r['短视频GMV']),
      shortVideoGmvRatio: parsePercentText(r['短视频GMV 占比']),
      productCardGmv: parseGmvText(r['商品卡GMV']),
      productCardGmvRatio: parsePercentText(r['商品卡GMV 占比']),
      showcaseGmv: parseGmvText(r['橱窗GMV']),
      showcaseGmvRatio: parsePercentText(r['橱窗GMV 占比']),
      // 核心指标
      gmv: safeNum(r['GMV']),
      orderCount: safeNum(r['订单量']),
      roi: safeNum(r['ROI']),
      // 占比（formula字段）
      ratioAuto: parsePercentText(parseAutoField(r['占比'])),
    }));

    // 计算汇总指标
    const totalGmv = cleaned.reduce((s, r) => s + r.gmv, 0);
    const totalOrders = cleaned.reduce((s, r) => s + r.orderCount, 0);
    const avgRoi = cleaned.length > 0
      ? (cleaned.reduce((s, r) => s + r.roi, 0) / cleaned.length).toFixed(2)
      : 0;

    // 渠道GMV分布汇总（使用真实数据）
    const channelBreakdown = {
      liveGmv: cleaned.reduce((s, r) => s + r.liveGmv, 0),
      shortVideoGmv: cleaned.reduce((s, r) => s + r.shortVideoGmv, 0),
      productCardGmv: cleaned.reduce((s, r) => s + r.productCardGmv, 0),
      showcaseGmv: cleaned.reduce((s, r) => s + r.showcaseGmv, 0),
    };

    res.json({
      success: true,
      summary: { totalGmv, totalOrders, avgRoi: parseFloat(avgRoi) },
      channelBreakdown,
      data: cleaned,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取渠道漏斗数据（完整15个字段）
 * GET /api/funnels
 */
router.get('/funnels', async (req, res, next) => {
  try {
    const tableId = config.bitable.tableIds.funnel;
    const records = await feishu.listAllRecords(tableId);

    const cleaned = records.map(r => ({
      bloggerId: r['博主ID'] || '',
      funnelType: r['漏斗类型'] || '',
      // 直播指标
      liveSessions: safeNum(r['直播场次']),
      viewers: safeNum(r['观看人数']),
      productClicks: safeNum(r['商品点击']),
      liveOrders: safeNum(r['直播订单']),
      liveGmv: safeNum(r['直播GMV']),
      // 短视频指标
      publishCount: safeNum(r['发布数量']),
      exposure: safeNum(r['曝光']),
      retention3s: safeNum(r['3秒留存']),
      completionRate: safeNum(r['完播率']),
      ctr: safeNum(r['商品点击CTR']),
      shortVideoOrders: safeNum(r['短视频订单']),
      shortVideoGmv: safeNum(r['短视频GMV']),
    }));

    // 按漏斗类型汇总
    const liveFunnel = cleaned.filter(r => r.funnelType === '直播');
    const shortFunnel = cleaned.filter(r => r.funnelType === '短视频');

    const aggregated = {
      live: {
        totalSessions: liveFunnel.reduce((s, r) => s + r.liveSessions, 0),
        totalViewers: liveFunnel.reduce((s, r) => s + r.viewers, 0),
        totalClicks: liveFunnel.reduce((s, r) => s + r.productClicks, 0),
        totalOrders: liveFunnel.reduce((s, r) => s + r.liveOrders, 0),
        totalGmv: liveFunnel.reduce((s, r) => s + r.liveGmv, 0),
        avgCtr: liveFunnel.length > 0
          ? (liveFunnel.reduce((s, r) => s + (r.viewers > 0 ? r.productClicks / r.viewers : 0), 0) / liveFunnel.length * 100)
          : 0,
        avgConversionRate: liveFunnel.length > 0
          ? (liveFunnel.reduce((s, r) => s + (r.productClicks > 0 ? r.liveOrders / r.productClicks : 0), 0) / liveFunnel.length * 100)
          : 0,
      },
      shortVideo: {
        totalPublish: shortFunnel.reduce((s, r) => s + r.publishCount, 0),
        totalExposure: shortFunnel.reduce((s, r) => s + r.exposure, 0),
        avgRetention3s: shortFunnel.length > 0
          ? (shortFunnel.reduce((s, r) => s + r.retention3s, 0) / shortFunnel.length)
          : 0,
        avgCompletion: shortFunnel.length > 0
          ? (shortFunnel.reduce((s, r) => s + r.completionRate, 0) / shortFunnel.length)
          : 0,
        totalClicks: shortFunnel.reduce((s, r) => s + r.productClicks, 0),
        avgCtr: shortFunnel.length > 0
          ? (shortFunnel.reduce((s, r) => s + r.ctr, 0) / shortFunnel.length)
          : 0,
        totalOrders: shortFunnel.reduce((s, r) => s + r.shortVideoOrders, 0),
        totalGmv: shortFunnel.reduce((s, r) => s + r.shortVideoGmv, 0),
      },
    };

    // 计算漏斗转化率
    if (aggregated.live.totalViewers > 0) {
      aggregated.live.clickRate = (aggregated.live.totalClicks / aggregated.live.totalViewers * 100).toFixed(1);
      aggregated.live.orderRate = (aggregated.live.totalOrders / aggregated.live.totalClicks * 100).toFixed(1);
    }
    if (aggregated.shortVideo.totalExposure > 0) {
      aggregated.shortVideo.clickRate = (aggregated.shortVideo.totalClicks / aggregated.shortVideo.totalExposure * 100).toFixed(1);
      aggregated.shortVideo.orderRate = (aggregated.shortVideo.totalOrders / aggregated.shortVideo.totalClicks * 100).toFixed(1);
    }

    res.json({ success: true, aggregated, data: cleaned });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取直播数据（完整20个字段）
 * GET /api/live-sessions
 */
router.get('/live-sessions', async (req, res, next) => {
  try {
    const tableId = config.bitable.tableIds.liveData;
    const records = await feishu.listAllRecords(tableId);

    const cleaned = records.map(r => ({
      sessionId: r['直播场次ID'] || '',
      date: r['直播日期'] || null,
      topic: r['直播主题'] || '',
      host: r['主播名称'] || '',
      // 观看数据
      totalViewers: safeNum(r['累计观看人数']),
      peakViewers: safeNum(r['峰值在线人数']),
      avgWatchTime: safeNum(r['平均观看时长']),
      // GMV数据
      liveGmv: safeNum(r['直播GMV']),
      orderCount: safeNum(r['直播订单量']),
      refundAmount: safeNum(r['退款金额']),
      netGmv: safeNum(r['直播净GMV']),
      // ROI数据
      adSpend: safeNum(r['投放消耗']),
      roi: safeNum(r['直播ROI']),
      // 互动数据
      productClicks: safeNum(r['商品点击人数']),
      newFollowers: safeNum(r['转粉人数']),
      // 状态
      status: r['直播状态'] || '',
      // 关联项目（lookup字段）
      projectLink: parseAutoField(r['所属项目ID']),
      projectDeadline: parseAutoField(r['所属项目截止日期']),
      projectTargetGmv: parseGmvText(parseAutoField(r['所属项目目标总GMV'])),
    }));

    // 直播汇总
    const liveSummary = {
      totalGmv: cleaned.reduce((s, r) => s + r.liveGmv, 0),
      totalNetGmv: cleaned.reduce((s, r) => s + r.netGmv, 0),
      totalOrders: cleaned.reduce((s, r) => s + r.orderCount, 0),
      totalViewers: cleaned.reduce((s, r) => s + r.totalViewers, 0),
      totalAdSpend: cleaned.reduce((s, r) => s + r.adSpend, 0),
      avgRoi: cleaned.length > 0
        ? (cleaned.reduce((s, r) => s + r.roi, 0) / cleaned.length).toFixed(2)
        : 0,
    };

    res.json({
      success: true,
      count: cleaned.length,
      summary: liveSummary,
      data: cleaned,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取看板汇总数据（合并所有接口，前端一次性加载）
 * GET /api/dashboard — 完整字段版
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    // 支持 ?force=1 强制刷新（跳过缓存，直接从飞书拉最新数据）
    if (req.query.force === '1') {
      feishu.clearCache();
      console.log('[API] 强制刷新：缓存已清空');
    }

    // 1. 先并行拉取4张表原始数据
    const [projectRecords, channelRecords, funnelRecords, liveSessionRecords] = await Promise.all([
      feishu.listAllRecords(config.bitable.tableIds.gmvOverview),
      feishu.listAllRecords(config.bitable.tableIds.channelOverview),
      feishu.listAllRecords(config.bitable.tableIds.funnel),
      feishu.listAllRecords(config.bitable.tableIds.liveData),
    ]);

    // 2. 构建项目元信息映射：recordId -> 项目信息（来自项目GMV总览表）
    const projectMetaMap = new Map();
    projectRecords.forEach(r => {
      const recordId = r.recordId;
      const projectId = parseAutoField(r['项目ID']);
      if (!projectId) return; // 跳过空记录
      projectMetaMap.set(recordId, {
        recordId,
        projectId,
        projectType: r['项目类型'] || '',
        projectStatus: r['项目状态'] || '',
        deadline: r['截止日期'] || null,
        remainingDays: parseAutoField(r['剩余日期']) || '',
        targetGmv: safeNum(r['目标总GMV']),
        // 项目表自身GMV（如果业务有填）
        orderGmv: parseGmvText(r['下单GMV（含未付）']),
        paidGmv: parseGmvText(r['支付GMV（已支付）']),
        refundGmv: parseGmvText(r['退款GMV']),
        netGmv: parseGmvText(r['净GMV']),
        totalExposure: safeNum(r['总曝光量']),
        clickCount: safeNum(r['点击人数']),
        orderCount: safeNum(parseAutoField(r['下单人数'])),
        avgOrderValue: parseGmvText(r['客单价']),
        // 渠道占比（项目表）
        liveGmvRatio: parsePercentText(r['直播GMV占比'] || r['直播间GMV 占比']),
        shortVideoGmv: parseGmvText(r['短视频GMV']),
        shortVideoGmvRatio: parsePercentText(r['短视频GMV 占比'] || r['短视频GMV占比']),
        productCardGmv: parseGmvText(r['商品卡GMV']),
        productCardGmvRatio: parsePercentText(r['商品卡GMV 占比'] || r['商品卡GMV占比']),
        showcaseGmv: parseGmvText(r['橱窗GMV']),
        showcaseGmvRatio: parsePercentText(r['橱窗GMV 占比'] || r['橱窗GMV占比']),
        // 直播关联指标
        totalLiveGmv: parseGmvText(parseAutoField(r['累计直播GMV'])),
        totalLiveSessions: safeNum(parseAutoField(r['总直播场次']), 0),
        avgLiveViewers: safeNum(parseAutoField(r['场均观看人数']), 0),
        liveCompletionRate: parsePercentText(parseAutoField(r['项目直播完成率'])),
      });
    });

    // 3. 处理渠道总览表：通过 关联项目 链接到项目 recordId
    const channels = channelRecords.map(r => ({
      projectId: '', // 后面通过 linkRecordId 解析
      linkRecordId: r['关联项目']?.link_record_ids?.[0] || null,
      liveGmv: parseGmvText(r['直播间GMV']),
      liveGmvRatio: parsePercentText(r['直播间GMV 占比']),
      shortVideoGmv: parseGmvText(r['短视频GMV']),
      shortVideoGmvRatio: parsePercentText(r['短视频GMV 占比']),
      productCardGmv: parseGmvText(r['商品卡GMV']),
      productCardGmvRatio: parsePercentText(r['商品卡GMV 占比']),
      showcaseGmv: parseGmvText(r['橱窗GMV']),
      showcaseGmvRatio: parsePercentText(r['橱窗GMV 占比']),
      gmv: safeNum(r['GMV']),
      orderCount: safeNum(r['订单量']),
      roi: safeNum(r['ROI']),
      ratioAuto: parsePercentText(parseAutoField(r['占比'])),
    })).map(c => {
      if (c.linkRecordId && projectMetaMap.has(c.linkRecordId)) {
        c.projectId = projectMetaMap.get(c.linkRecordId).projectId;
      }
      return c;
    });

    // 4. 按项目聚合渠道数据：linkRecordId -> { gmv, orderCount, roi, channelBreakdown... }
    const channelAggByProject = new Map();
    channels.forEach(c => {
      if (!c.linkRecordId) return;
      const existing = channelAggByProject.get(c.linkRecordId) || {
        gmv: 0, orderCount: 0, roiSum: 0, roiCount: 0,
        liveGmv: 0, shortVideoGmv: 0, productCardGmv: 0, showcaseGmv: 0,
      };
      existing.gmv += c.gmv;
      existing.orderCount += c.orderCount;
      if (c.roi > 0) {
        existing.roiSum += c.roi;
        existing.roiCount += 1;
      }
      existing.liveGmv += c.liveGmv;
      existing.shortVideoGmv += c.shortVideoGmv;
      existing.productCardGmv += c.productCardGmv;
      existing.showcaseGmv += c.showcaseGmv;
      channelAggByProject.set(c.linkRecordId, existing);
    });

    // 5. 合并生成最终项目列表：以项目表元信息为基础，无值时回退到渠道表聚合值
    const projects = [];
    projectMetaMap.forEach((meta, recordId) => {
      const channelAgg = channelAggByProject.get(recordId) || {
        gmv: 0, orderCount: 0, roiSum: 0, roiCount: 0,
        liveGmv: 0, shortVideoGmv: 0, productCardGmv: 0, showcaseGmv: 0,
      };
      const roi = channelAgg.roiCount > 0 ? channelAgg.roiSum / channelAgg.roiCount : 0;

      projects.push({
        ...meta,
        // 优先用项目表自身的值，空则用渠道表聚合值兜底
        orderGmv: meta.orderGmv || 0,
        paidGmv: meta.paidGmv || 0,
        refundGmv: meta.refundGmv || 0,
        netGmv: meta.netGmv > 0 ? meta.netGmv : channelAgg.gmv,
        targetGmv: meta.targetGmv > 0 ? meta.targetGmv : (channelAgg.gmv * 1.2), // 未设目标时按实际GMV的120%估算，便于展示达成率
        orderCount: meta.orderCount > 0 ? meta.orderCount : channelAgg.orderCount,
        avgOrderValue: meta.avgOrderValue > 0 ? meta.avgOrderValue : (channelAgg.orderCount > 0 ? channelAgg.gmv / channelAgg.orderCount : 0),
        roi: roi,
        // 渠道GMV拆分（优先项目表，否则用渠道表聚合）
        liveGmv: channelAgg.liveGmv,
        shortVideoGmv: channelAgg.shortVideoGmv,
        productCardGmv: channelAgg.productCardGmv,
        showcaseGmv: channelAgg.showcaseGmv,
      });
    });

    // 6. 漏斗数据
    const funnels = funnelRecords.map(r => ({
      bloggerId: r['博主ID'] || '',
      funnelType: r['漏斗类型'] || '',
      liveSessions: safeNum(r['直播场次']),
      viewers: safeNum(r['观看人数']),
      productClicks: safeNum(r['商品点击']),
      liveOrders: safeNum(r['直播订单']),
      liveGmv: safeNum(r['直播GMV']),
      publishCount: safeNum(r['发布数量']),
      exposure: safeNum(r['曝光']),
      retention3s: safeNum(r['3秒留存']),
      completionRate: safeNum(r['完播率']),
      ctr: safeNum(r['商品点击CTR']),
      shortVideoOrders: safeNum(r['短视频订单']),
      shortVideoGmv: safeNum(r['短视频GMV']),
    }));

    // 7. 直播数据
    const liveSessions = liveSessionRecords.map(r => ({
      sessionId: r['直播场次ID'] || '',
      date: r['直播日期'] || null,
      topic: r['直播主题'] || '',
      host: r['主播名称'] || '',
      totalViewers: safeNum(r['累计观看人数']),
      peakViewers: safeNum(r['峰值在线人数']),
      avgWatchTime: safeNum(r['平均观看时长']),
      liveGmv: safeNum(r['直播GMV']),
      orderCount: safeNum(r['直播订单量']),
      refundAmount: safeNum(r['退款金额']),
      netGmv: safeNum(r['直播净GMV']),
      adSpend: safeNum(r['投放消耗']),
      roi: safeNum(r['直播ROI']),
      productClicks: safeNum(r['商品点击人数']),
      newFollowers: safeNum(r['转粉人数']),
      status: r['直播状态'] || '',
      projectLink: parseAutoField(r['所属项目ID']),
      projectTargetGmv: parseGmvText(parseAutoField(r['所属项目目标总GMV'])),
    }));

    // 8. KPI汇总（以渠道表为GMV主数据源，项目表合并后的 netGmv 为净GMV）
    const totalGmv = channels.reduce((s, r) => s + r.gmv, 0);
    const totalOrders = channels.reduce((s, r) => s + r.orderCount, 0);
    const totalNetGmv = projects.reduce((s, r) => s + r.netGmv, 0);
    const avgRoi = channels.length > 0
      ? (channels.reduce((s, r) => s + r.roi, 0) / channels.length)
      : 0;
    const avgOrderValue = totalOrders > 0 ? totalNetGmv / totalOrders : 0;
    const activeProjects = projects.filter(p => p.projectStatus === '进行中').length;
    const totalTargetGmv = projects.reduce((s, r) => s + r.targetGmv, 0);
    const targetCompletionRate = totalTargetGmv > 0 ? (totalNetGmv / totalTargetGmv * 100) : 0;

    // 9. 渠道GMV分布（真实数据）
    const channelBreakdown = {
      liveGmv: channels.reduce((s, r) => s + r.liveGmv, 0),
      shortVideoGmv: channels.reduce((s, r) => s + r.shortVideoGmv, 0),
      productCardGmv: channels.reduce((s, r) => s + r.productCardGmv, 0),
      showcaseGmv: channels.reduce((s, r) => s + r.showcaseGmv, 0),
    };
    const hasChannelBreakdown = channelBreakdown.liveGmv > 0 || channelBreakdown.shortVideoGmv > 0 ||
      channelBreakdown.productCardGmv > 0 || channelBreakdown.showcaseGmv > 0;

    // 10. 漏斗聚合
    const liveFunnel = funnels.filter(r => r.funnelType === '直播');
    const shortFunnel = funnels.filter(r => r.funnelType === '短视频');

    const funnelAggregated = {
      live: {
        totalSessions: liveFunnel.reduce((s, r) => s + r.liveSessions, 0),
        totalViewers: liveFunnel.reduce((s, r) => s + r.viewers, 0),
        totalClicks: liveFunnel.reduce((s, r) => s + r.productClicks, 0),
        totalOrders: liveFunnel.reduce((s, r) => s + r.liveOrders, 0),
        totalGmv: liveFunnel.reduce((s, r) => s + r.liveGmv, 0),
      },
      shortVideo: {
        totalPublish: shortFunnel.reduce((s, r) => s + r.publishCount, 0),
        totalExposure: shortFunnel.reduce((s, r) => s + r.exposure, 0),
        avgRetention3s: shortFunnel.length > 0
          ? (shortFunnel.reduce((s, r) => s + r.retention3s, 0) / shortFunnel.length)
          : 0,
        avgCompletion: shortFunnel.length > 0
          ? (shortFunnel.reduce((s, r) => s + r.completionRate, 0) / shortFunnel.length)
          : 0,
        totalClicks: shortFunnel.reduce((s, r) => s + r.productClicks, 0),
        totalOrders: shortFunnel.reduce((s, r) => s + r.shortVideoOrders, 0),
        totalGmv: shortFunnel.reduce((s, r) => s + r.shortVideoGmv, 0),
      },
    };

    res.json({
      success: true,
      kpi: {
        totalGmv,
        totalNetGmv,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue),
        avgRoi: parseFloat(avgRoi.toFixed(2)),
        projectCount: projects.length,
        activeProjects,
        totalTargetGmv,
        targetCompletionRate: parseFloat(targetCompletionRate.toFixed(1)),
      },
      channelBreakdown,
      hasChannelBreakdown,
      funnelAggregated,
      projects,
      channels,
      funnels,
      liveSessions,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 手动刷新缓存
 * POST /api/refresh-cache
 */
router.post('/refresh-cache', async (req, res) => {
  feishu.clearCache();
  // 通知所有SSE客户端
  if (global.sseClients && global.sseClients.length > 0) {
    const message = JSON.stringify({ type: 'cache-refresh', timestamp: new Date().toISOString() });
    global.sseClients.forEach(client => {
      try { client.res.write(`data: ${message}\n\n`); } catch (e) { /* 客户端可能已断开 */ }
    });
  }
  res.json({ success: true, message: '缓存已清空，下次请求将重新从飞书获取数据，SSE客户端已通知' });
});

/**
 * 飞书事件回调（Webhook）
 * POST /api/webhook/feishu
 * 用于接收飞书多维表格变更事件，实现实时数据同步
 */
router.post('/webhook/feishu', async (req, res) => {
  const body = req.body;

  // 飞书事件验证（首次配置时发送 challenge）
  if (body.challenge) {
    return res.json({ challenge: body.challenge });
  }

  // 处理事件通知
  const event = body.event;
  if (event && event.app_token === config.bitable.appToken) {
    console.log(`[Webhook] 收到飞书多维表格变更事件: ${event.type || 'unknown'}`);
    // 清空缓存，下次请求重新获取
    feishu.clearCache();
    // 推送SSE通知给所有前端客户端
    if (global.sseClients && global.sseClients.length > 0) {
      const message = JSON.stringify({
        type: 'data-updated',
        source: 'feishu-webhook',
        detail: event.type || 'bitable_record_changed',
        timestamp: new Date().toISOString(),
      });
      global.sseClients.forEach(client => {
        try { client.res.write(`data: ${message}\n\n`); } catch (e) { /* ignore */ }
      });
    }
  }

  // 飞书要求必须在3秒内返回200
  res.json({ success: true });
});

module.exports = router;
