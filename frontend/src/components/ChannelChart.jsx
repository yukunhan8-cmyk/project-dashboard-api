import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * 渠道GMV分布环形图
 * 使用真实渠道总览数据，无细分数据时显示占位提示
 */
export default function ChannelChart({ channels, channelBreakdown, hasChannelBreakdown }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 优先使用后端汇总的 channelBreakdown，如果没有则从 channels 计算
    const breakdown = channelBreakdown || {
      liveGmv: channels?.reduce((s, r) => s + (r.liveGmv || 0), 0) || 0,
      shortVideoGmv: channels?.reduce((s, r) => s + (r.shortVideoGmv || 0), 0) || 0,
      productCardGmv: channels?.reduce((s, r) => s + (r.productCardGmv || 0), 0) || 0,
      showcaseGmv: channels?.reduce((s, r) => s + (r.showcaseGmv || 0), 0) || 0,
    };

    const total = breakdown.liveGmv + breakdown.shortVideoGmv + breakdown.productCardGmv + breakdown.showcaseGmv;

    // 如果无细分数据，清空图表并直接返回，由父级占位层显示提示
    if (total === 0 || hasChannelBreakdown === false) {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      return;
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const pieData = [
      {
        value: Math.round(breakdown.liveGmv),
        name: '直播间',
        itemStyle: { color: '#3b82f6' },
      },
      {
        value: Math.round(breakdown.shortVideoGmv),
        name: '短视频',
        itemStyle: { color: '#06b6d4' },
      },
      {
        value: Math.round(breakdown.productCardGmv),
        name: '商品卡',
        itemStyle: { color: '#8b5cf6' },
      },
      {
        value: Math.round(breakdown.showcaseGmv),
        name: '橱窗',
        itemStyle: { color: '#f59e0b' },
      },
    ].filter(d => d.value > 0); // 过滤掉值为0的渠道

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => {
          return `${params.name}<br/>GMV: ¥${params.value.toLocaleString()}<br/>占比: ${params.percent}%`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#f1f5f9',
            formatter: '{b}\n{d}%',
          },
        },
        labelLine: { show: false },
        data: pieData,
      }],
      graphic: [{
        type: 'text',
        left: '32%',
        top: '45%',
        style: {
          text: '总GMV',
          textAlign: 'center',
          fill: '#64748b',
          fontSize: 12,
        },
      }, {
        type: 'text',
        left: '30%',
        top: '52%',
        style: {
          text: `¥${(total / 10000).toFixed(1)}万`,
          textAlign: 'center',
          fill: '#f1f5f9',
          fontSize: 16,
          fontWeight: 'bold',
        },
      }],
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current && chartInstance.current.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [channels, channelBreakdown, hasChannelBreakdown]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={chartRef} className="chart-container" />
      {(hasChannelBreakdown === false) && (
        <div className="chart-empty-placeholder">
          <div className="chart-empty-icon">📊</div>
          <div className="chart-empty-title">暂无渠道细分数据</div>
          <div className="chart-empty-desc">
            飞书「项目渠道总览表」中的<br/>
            直播间GMV / 短视频GMV / 商品卡GMV / 橱窗GMV 字段未填写<br/>
            填写后即可看到渠道分布饼图
          </div>
        </div>
      )}
    </div>
  );
}
