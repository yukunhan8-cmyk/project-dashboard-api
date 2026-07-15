import React from 'react';

export default function LiveTable({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>暂无直播数据</div>;
  }

  const getStatusClass = (status) => {
    switch (status) {
      case '已完成': return 'status-badge status-completed';
      case '进行中': return 'status-badge status-active';
      case '待开播': return 'status-badge status-pending';
      default: return 'status-badge status-inactive';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatGmv = (val) => {
    if (!val || val === 0) return '-';
    if (val >= 10000) return `¥${(val / 10000).toFixed(1)}万`;
    return `¥${val.toLocaleString()}`;
  };

  const getRoiColor = (roi) => {
    if (roi >= 3) return '#10b981'; // 高ROI
    if (roi >= 2) return '#06b6d4'; // 中等
    if (roi >= 1) return '#f59e0b'; // 一般
    return '#ef4444'; // 低ROI
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>场次</th>
            <th>日期</th>
            <th>主题</th>
            <th>主播</th>
            <th>观看人数</th>
            <th>峰值在线</th>
            <th>GMV</th>
            <th>净GMV</th>
            <th>投放消耗</th>
            <th>ROI</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {data.map((live, idx) => (
            <tr key={idx}>
              <td>{live.sessionId}</td>
              <td>{formatDate(live.date)}</td>
              <td style={{ fontWeight: 500 }}>{live.topic || '-'}</td>
              <td>{live.host || '-'}</td>
              <td className="num">{live.totalViewers ? live.totalViewers.toLocaleString() : '-'}</td>
              <td className="num">{live.peakViewers ? live.peakViewers.toLocaleString() : '-'}</td>
              <td className="num" style={{ color: '#3b82f6' }}>
                {formatGmv(live.liveGmv)}
              </td>
              <td className="num" style={{ color: '#10b981' }}>
                {formatGmv(live.netGmv)}
              </td>
              <td className="num" style={{ color: '#f59e0b' }}>
                {formatGmv(live.adSpend)}
              </td>
              <td className="num" style={{ color: getRoiColor(live.roi), fontWeight: 600 }}>
                {live.roi ? `${live.roi}x` : '-'}
              </td>
              <td>
                <span className={getStatusClass(live.status)}>
                  {live.status || '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
