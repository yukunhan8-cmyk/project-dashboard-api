import React, { useEffect, useRef } from 'react';

function KpiCard({ label, value, prefix = '', suffix = '', color = '#3b82f6', sub = '' }) {
  const valueRef = useRef(null);

  useEffect(() => {
    if (!valueRef.current) return;
    const el = valueRef.current;
    const start = 0;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;

      if (Number.isInteger(end)) {
        el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
      } else {
        el.textContent = prefix + current.toLocaleString(undefined, { maximumFractionDigits: 1 }) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, prefix, suffix]);

  return (
    <div className="card kpi-card">
      <div className="kpi-label">{label}</div>
      <div
        className="kpi-value num"
        ref={valueRef}
        style={{ color }}
      >
        {prefix}{value.toLocaleString()}{suffix}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function KpiCards({ kpi }) {
  if (!kpi) return null;

  // 目标达成率颜色：>=100%绿色，>=60%橙色，<60%红色
  const completionColor = kpi.targetCompletionRate >= 100
    ? '#10b981'
    : kpi.targetCompletionRate >= 60
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div className="grid grid-4">
      <KpiCard
        label="总GMV"
        value={kpi.totalGmv}
        prefix="¥"
        color="#3b82f6"
        sub={`净GMV: ¥${kpi.totalNetGmv.toLocaleString()}`}
      />
      <KpiCard
        label="总订单量"
        value={kpi.totalOrders}
        suffix=" 单"
        color="#06b6d4"
        sub={`客单价: ¥${kpi.avgOrderValue.toLocaleString()}`}
      />
      <KpiCard
        label="平均ROI"
        value={kpi.avgRoi}
        suffix="x"
        color="#8b5cf6"
        sub={`${kpi.activeProjects} 个项目进行中`}
      />
      <KpiCard
        label="目标达成率"
        value={kpi.targetCompletionRate}
        suffix="%"
        color={completionColor}
        sub={`目标: ¥${kpi.totalTargetGmv.toLocaleString()}`}
      />
    </div>
  );
}
