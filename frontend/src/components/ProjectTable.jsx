import React from 'react';

// 解析飞书多维表格的富文本字段
function extractText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(item => item.text || '').join('');
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.value)) {
      return value.value.map(item => item.text || '').join('');
    }
    return value.text || JSON.stringify(value);
  }
  return String(value || '');
}

export default function ProjectTable({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>暂无数据</div>;
  }

  const getStatusClass = (status) => {
    switch (status) {
      case '进行中': return 'status-badge status-active';
      case '待启动': return 'status-badge status-pending';
      case '已完成': return 'status-badge status-completed';
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

  // 达成率颜色
  const getCompletionColor = (rate) => {
    if (rate >= 100) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const displayData = data.slice(0, 10);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>项目名称</th>
            <th>类型</th>
            <th>状态</th>
            <th>截止日期</th>
            <th>剩余天数</th>
            <th>净GMV</th>
            <th>目标GMV</th>
            <th>达成率</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((project, idx) => {
            const completionRate = project.targetGmv > 0
              ? ((project.netGmv / project.targetGmv) * 100).toFixed(1)
              : '-';
            const completionNum = parseFloat(completionRate) || 0;

            return (
              <tr key={idx}>
                <td style={{ fontWeight: 500 }}>{extractText(project.projectId) || '-'}</td>
                <td>{project.projectType || '-'}</td>
                <td>
                  <span className={getStatusClass(project.projectStatus)}>
                    {project.projectStatus || '-'}
                  </span>
                </td>
                <td>{formatDate(project.deadline)}</td>
                <td>{extractText(project.remainingDays) || '-'}</td>
                <td className="num" style={{ color: '#3b82f6' }}>
                  {formatGmv(project.netGmv)}
                </td>
                <td className="num" style={{ color: '#f59e0b' }}>
                  {formatGmv(project.targetGmv)}
                </td>
                <td className="num" style={{ position: 'relative' }}>
                  <span style={{ color: getCompletionColor(completionNum), fontWeight: 600 }}>
                    {completionRate !== '-' ? completionRate + '%' : '-'}
                  </span>
                  {/* 小进度条 */}
                  {completionRate !== '-' && (
                    <div className="mini-progress" style={{
                      marginTop: '4px',
                      height: '3px',
                      borderRadius: '1.5px',
                      background: 'rgba(148, 163, 184, 0.15)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(completionNum, 100)}%`,
                        height: '100%',
                        borderRadius: '1.5px',
                        background: getCompletionColor(completionNum),
                      }} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length > 10 && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: 12 }}>
          还有 {data.length - 10} 条记录...
        </div>
      )}
    </div>
  );
}
