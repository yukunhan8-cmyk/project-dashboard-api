import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * 项目GMV达成率对比图
 * 每个项目显示实际净GMV vs 目标GMV，附带达成率百分比
 */
export default function GmvTargetChart({ projects }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !projects || projects.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const names = projects.map(p => p.projectId || '未命名');
    const actualGmv = projects.map(p => p.netGmv || 0);
    const targetGmv = projects.map(p => p.targetGmv || 0);
    // 达成率百分比
    const completionRates = projects.map(p =>
      p.targetGmv > 0 ? ((p.netGmv / p.targetGmv) * 100).toFixed(1) : 0
    );

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => {
          const name = params[0].name;
          const actual = params[0].value;
          const target = params[1].value;
          const rate = target > 0 ? ((actual / target) * 100).toFixed(1) : '-';
          return `${name}<br/>实际净GMV: ¥${actual.toLocaleString()}<br/>目标GMV: ¥${target.toLocaleString()}<br/>达成率: ${rate}%`;
        },
      },
      legend: {
        data: ['实际净GMV', '目标GMV', '达成率'],
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '3%',
        top: '40px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          rotate: names.length > 4 ? 30 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'GMV',
          nameTextStyle: { color: '#64748b', fontSize: 11 },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
          axisLabel: {
            color: '#64748b',
            formatter: (val) => {
              if (val >= 10000) return (val / 10000).toFixed(0) + '万';
              if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
              return val;
            },
          },
        },
        {
          type: 'value',
          name: '达成率',
          nameTextStyle: { color: '#64748b', fontSize: 11 },
          max: 150,
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: '#64748b',
            formatter: (val) => val + '%',
          },
        },
      ],
      series: [
        {
          name: '实际净GMV',
          type: 'bar',
          data: actualGmv,
          barWidth: '25%',
          barGap: '10%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' },
            ]),
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#2563eb' },
              ]),
            },
          },
        },
        {
          name: '目标GMV',
          type: 'bar',
          data: targetGmv,
          barWidth: '25%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f59e0b' },
              { offset: 1, color: '#d97706' },
            ]),
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#fbbf24' },
                { offset: 1, color: '#f59e0b' },
              ]),
            },
          },
        },
        {
          name: '达成率',
          type: 'line',
          yAxisIndex: 1,
          data: completionRates,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
          label: {
            show: true,
            position: 'top',
            color: '#10b981',
            fontSize: 11,
            formatter: (p) => p.value + '%',
          },
          // 100%参考线标记
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#10b981', type: 'dashed', width: 1 },
            data: [{ yAxis: 100, name: '100%' }],
            label: { formatter: '100%目标线', color: '#10b981', fontSize: 10 },
          },
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current && chartInstance.current.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [projects]);

  return <div ref={chartRef} className="chart-container" />;
}
