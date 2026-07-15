import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * 转化漏斗分析图
 * 左侧：直播漏斗（观看→点击→订单→GMV）
 * 右侧：短视频漏斗（曝光→留存→完播→点击→订单→GMV）
 * 中间显示转化率
 */
export default function FunnelChart({ data, funnelAggregated }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 优先使用后端聚合数据
    let liveSum, shortSum;

    if (funnelAggregated) {
      liveSum = funnelAggregated.live;
      shortSum = funnelAggregated.shortVideo;
    } else if (data && data.length > 0) {
      const liveData = data.filter(f => f.funnelType === '直播');
      const shortData = data.filter(f => f.funnelType === '短视频');

      liveSum = {
        totalViewers: liveData.reduce((s, f) => s + (f.viewers || 0), 0),
        totalClicks: liveData.reduce((s, f) => s + (f.productClicks || 0), 0),
        totalOrders: liveData.reduce((s, f) => s + (f.liveOrders || 0), 0),
        totalGmv: liveData.reduce((s, f) => s + (f.liveGmv || 0), 0),
      };
      shortSum = {
        totalExposure: shortData.reduce((s, f) => s + (f.exposure || 0), 0),
        avgRetention3s: shortData.length > 0
          ? (shortData.reduce((s, f) => s + (f.retention3s || 0), 0) / shortData.length) : 0,
        avgCompletion: shortData.length > 0
          ? (shortData.reduce((s, f) => s + (f.completionRate || 0), 0) / shortData.length) : 0,
        totalClicks: shortData.reduce((s, f) => s + (f.productClicks || 0), 0),
        totalOrders: shortData.reduce((s, f) => s + (f.shortVideoOrders || 0), 0),
        totalGmv: shortData.reduce((s, f) => s + (f.shortVideoGmv || 0), 0),
      };
    } else {
      return; // 无数据
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 计算直播转化率
    const liveClickRate = liveSum.totalViewers > 0
      ? ((liveSum.totalClicks / liveSum.totalViewers) * 100).toFixed(1) : '0.0';
    const liveOrderRate = liveSum.totalClicks > 0
      ? ((liveSum.totalOrders / liveSum.totalClicks) * 100).toFixed(1) : '0.0';

    // 计算短视频转化率
    const shortClickRate = shortSum.totalExposure > 0
      ? ((shortSum.totalClicks / shortSum.totalExposure) * 100).toFixed(1) : '0.0';
    const shortOrderRate = shortSum.totalClicks > 0
      ? ((shortSum.totalOrders / shortSum.totalClicks) * 100).toFixed(1) : '0.0';

    const formatNum = (val) => {
      if (val >= 10000) return (val / 10000).toFixed(1) + '万';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
      return val.toLocaleString();
    };

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: { color: '#f1f5f9' },
      },
      // 顶部标题区分直播和短视频
      title: [
        {
          text: '直播转化漏斗',
          left: '22%',
          top: '5px',
          textStyle: { color: '#3b82f6', fontSize: 13, fontWeight: 600 },
        },
        {
          text: '短视频转化漏斗',
          left: '62%',
          top: '5px',
          textStyle: { color: '#06b6d4', fontSize: 13, fontWeight: 600 },
        },
      ],
      grid: [
        { left: '5%', width: '38%', containLabel: true, top: '30px' },
        { left: '55%', width: '38%', containLabel: true, top: '30px' },
      ],
      xAxis: [
        { type: 'value', gridIndex: 0, show: false },
        { type: 'value', gridIndex: 1, show: false },
      ],
      yAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: ['GMV', '订单', '商品点击', '观看人数'],
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 12 },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: ['GMV', '订单', '商品点击', '完播率', '3秒留存', '曝光'],
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 12 },
        },
      ],
      series: [
        // 直播漏斗
        {
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: [
            {
              value: liveSum.totalGmv,
              itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: liveSum.totalOrders,
              itemStyle: { color: '#60a5fa', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: liveSum.totalClicks,
              itemStyle: { color: '#93c5fd', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: liveSum.totalViewers,
              itemStyle: { color: '#bfdbfe', borderRadius: [0, 4, 4, 0] },
            },
          ],
          barWidth: 28,
          label: {
            show: true,
            position: 'right',
            color: '#f1f5f9',
            fontSize: 12,
            formatter: (p) => p.value >= 10000 ? formatNum(p.value) : p.value.toLocaleString(),
          },
        },
        // 短视频漏斗
        {
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: [
            {
              value: shortSum.totalGmv,
              itemStyle: { color: '#06b6d4', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: shortSum.totalOrders,
              itemStyle: { color: '#22d3ee', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: shortSum.totalClicks,
              itemStyle: { color: '#67e8f9', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: (shortSum.avgCompletion * 100).toFixed(0),
              itemStyle: { color: '#a5f3fc', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: (shortSum.avgRetention3s * 100).toFixed(0),
              itemStyle: { color: '#cffafe', borderRadius: [0, 4, 4, 0] },
            },
            {
              value: shortSum.totalExposure,
              itemStyle: { color: '#ecfeff', borderRadius: [0, 4, 4, 0] },
            },
          ],
          barWidth: 28,
          label: {
            show: true,
            position: 'right',
            color: '#f1f5f9',
            fontSize: 12,
            formatter: (p) => {
              // 完播率和3秒留存显示百分比
              if (p.dataIndex === 3 || p.dataIndex === 4) {
                return p.value + '%';
              }
              return p.value >= 10000 ? formatNum(p.value) : p.value.toLocaleString();
            },
          },
        },
      ],
      // 转化率标注（用graphic直接在图表区域标注）
      graphic: [
        // 直播转化率标注
        {
          type: 'group',
          left: '43%',
          top: '35%',
          children: [
            {
              type: 'text',
              style: {
                text: `点击率 ${liveClickRate}%`,
                fill: '#3b82f6',
                fontSize: 11,
                fontWeight: 500,
              },
            },
            {
              type: 'text',
              style: {
                text: `下单率 ${liveOrderRate}%`,
                fill: '#60a5fa',
                fontSize: 11,
                fontWeight: 500,
                y: 18,
              },
            },
          ],
        },
        // 短视频转化率标注
        {
          type: 'group',
          left: '93%',
          top: '35%',
          children: [
            {
              type: 'text',
              style: {
                text: `CTR ${shortClickRate}%`,
                fill: '#06b6d4',
                fontSize: 11,
                fontWeight: 500,
              },
            },
            {
              type: 'text',
              style: {
                text: `下单率 ${shortOrderRate}%`,
                fill: '#22d3ee',
                fontSize: 11,
                fontWeight: 500,
                y: 18,
              },
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current && chartInstance.current.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, funnelAggregated]);

  return <div ref={chartRef} className="chart-container large" />;
}
