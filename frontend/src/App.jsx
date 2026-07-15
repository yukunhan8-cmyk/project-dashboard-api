import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import KpiCards from './components/KpiCards.jsx';
import GmvTargetChart from './components/GmvTargetChart.jsx';
import ChannelChart from './components/ChannelChart.jsx';
import FunnelChart from './components/FunnelChart.jsx';
import ProjectTable from './components/ProjectTable.jsx';
import LiveTable from './components/LiveTable.jsx';

// API基础地址
const API_BASE = import.meta.env.VITE_API_BASE || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState('connecting'); // connecting | connected | updating | offline
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const sseRef = useRef(null);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/dashboard');
      if (res.data.success) {
        setData(res.data);
        setLastSyncTime(new Date());
      } else {
        throw new Error(res.data.message || '数据获取失败');
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      setError(err.response?.data?.message || err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE 实时推送连接
  useEffect(() => {
    let reconnectTimer;

    function connectSSE() {
      const sseUrl = `${API_BASE}/api/sse`;
      const eventSource = new EventSource(sseUrl);
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] 连接已建立');
        setSyncStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[SSE] 收到消息:', msg.type);

          if (msg.type === 'heartbeat') {
            // 心跳，保持连接状态
            setSyncStatus('connected');
          } else if (msg.type === 'data-updated' || msg.type === 'data-poll' || msg.type === 'cache-refresh') {
            // 数据有更新，重新获取完整数据
            setSyncStatus('updating');
            fetchData().then(() => {
              setSyncStatus('connected');
            });
          }
        } catch (e) {
          // 忽略无法解析的消息
        }
      };

      eventSource.onerror = () => {
        console.log('[SSE] 连接断开，5秒后重连');
        setSyncStatus('offline');
        eventSource.close();
        reconnectTimer = setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    return () => {
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [fetchData]);

  // 初始加载 + 定时轮询兜底（SSE断开时仍能刷新）
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // 1分钟兜底轮询
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const getSyncStatusLabel = () => {
    switch (syncStatus) {
      case 'connecting': return '连接中...';
      case 'connected': return '实时同步';
      case 'updating': return '数据更新中...';
      case 'offline': return '离线（自动重连）';
      default: return '未知';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'connecting': return '⟳';
      case 'connected': return '●';
      case 'updating': return '⟳';
      case 'offline': return '○';
      default: return '?';
    }
  };

  return (
    <div className="dashboard">
      {/* 顶部导航 */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>项目经营管理数据看板</h1>
          <div className="sync-indicator">
            <span className={`sync-dot sync-${syncStatus}`}>{getSyncStatusIcon()}</span>
            <span className="sync-label">{getSyncStatusLabel()}</span>
            {lastSyncTime && (
              <span className="sync-time">
                最后同步: {formatDateTime(lastSyncTime)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="datetime">{formatDateTime(currentTime)}</span>
          <button
            className="refresh-btn"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="error-message">
            数据加载失败: {error}
            <br />
            <button className="refresh-btn" onClick={fetchData} style={{ marginTop: '12px' }}>
              重试
            </button>
          </div>
        </div>
      )}

      {/* 加载中 */}
      {loading && !data && (
        <div className="card">
          <div className="loading">
            <div className="spinner"></div>
            正在加载数据...
          </div>
        </div>
      )}

      {/* 数据展示 */}
      {data && (
        <>
          {/* KPI 指标卡片 — 8个 */}
          <KpiCards kpi={data.kpi} />

          {/* GMV分析区 */}
          <div className="grid grid-2" style={{ marginTop: '20px' }}>
            <div className="card">
              <div className="card-title">项目GMV达成率</div>
              <GmvTargetChart projects={data.projects} />
            </div>
            <div className="card">
              <div className="card-title">渠道GMV分布</div>
              <ChannelChart channels={data.channels} channelBreakdown={data.channelBreakdown} hasChannelBreakdown={data.hasChannelBreakdown} />
            </div>
          </div>

          {/* 漏斗分析 */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-title">转化漏斗分析</div>
            <FunnelChart data={data.funnels} funnelAggregated={data.funnelAggregated} />
          </div>

          {/* 表格区域 */}
          <div className="grid grid-2" style={{ marginTop: '20px' }}>
            <div className="card">
              <div className="card-title">项目总览</div>
              <ProjectTable data={data.projects} />
            </div>
            <div className="card">
              <div className="card-title">直播数据明细</div>
              <LiveTable data={data.liveSessions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
