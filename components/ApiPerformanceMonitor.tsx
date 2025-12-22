'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Server,
  Globe,
  Database,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  Download,
  Settings,
  Bell,
  ChevronDown,
  ChevronRight,
  Info,
  Cpu,
  HardDrive,
  Wifi,
  Timer,
  Target,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  MoreVertical
} from 'lucide-react';

// Types
interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ElementType;
  color: string;
}

interface EndpointMetric {
  endpoint: string;
  method: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'down';
}

interface ErrorEntry {
  id: string;
  endpoint: string;
  statusCode: number;
  message: string;
  count: number;
  lastOccurred: string;
  trend: 'up' | 'down' | 'stable';
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

interface RegionLatency {
  region: string;
  latency: number;
  status: 'good' | 'fair' | 'poor';
}

// Mock data generators
const generateTimeSeriesData = (hours: number, baseValue: number, variance: number): TimeSeriesPoint[] => {
  const data: TimeSeriesPoint[] = [];
  const now = new Date();
  for (let i = hours * 4; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);
    const value = baseValue + (Math.random() - 0.5) * variance;
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.max(0, value)
    });
  }
  return data;
};

// Mock data
const performanceMetrics: PerformanceMetric[] = [
  {
    id: 'avg-latency',
    name: 'Avg Response Time',
    value: 142,
    unit: 'ms',
    change: -8.5,
    status: 'healthy',
    icon: Timer,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'throughput',
    name: 'Requests/min',
    value: 2847,
    unit: 'req/min',
    change: 12.3,
    status: 'healthy',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'error-rate',
    name: 'Error Rate',
    value: 0.24,
    unit: '%',
    change: -0.08,
    status: 'healthy',
    icon: AlertTriangle,
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'uptime',
    name: 'Uptime',
    value: 99.98,
    unit: '%',
    change: 0.01,
    status: 'healthy',
    icon: CheckCircle2,
    color: 'from-purple-500 to-violet-600'
  }
];

const endpointMetrics: EndpointMetric[] = [
  { endpoint: '/api/v1/qr-codes', method: 'POST', avgLatency: 185, p50: 142, p95: 320, p99: 485, requests: 15420, errorRate: 0.12, status: 'healthy' },
  { endpoint: '/api/v1/qr-codes', method: 'GET', avgLatency: 45, p50: 38, p95: 85, p99: 120, requests: 28540, errorRate: 0.05, status: 'healthy' },
  { endpoint: '/api/v1/qr-codes/{id}', method: 'GET', avgLatency: 52, p50: 42, p95: 98, p99: 145, requests: 42180, errorRate: 0.08, status: 'healthy' },
  { endpoint: '/api/v1/analytics/{id}', method: 'GET', avgLatency: 285, p50: 210, p95: 520, p99: 780, requests: 8920, errorRate: 0.18, status: 'degraded' },
  { endpoint: '/api/v1/webhooks', method: 'POST', avgLatency: 125, p50: 98, p95: 245, p99: 380, requests: 3420, errorRate: 0.25, status: 'healthy' },
  { endpoint: '/api/v1/account', method: 'GET', avgLatency: 68, p50: 55, p95: 125, p99: 180, requests: 12850, errorRate: 0.02, status: 'healthy' }
];

const recentErrors: ErrorEntry[] = [
  { id: 'err-1', endpoint: '/api/v1/qr-codes', statusCode: 429, message: 'Rate limit exceeded', count: 145, lastOccurred: '2024-01-28T15:42:00Z', trend: 'up' },
  { id: 'err-2', endpoint: '/api/v1/analytics/{id}', statusCode: 500, message: 'Internal server error', count: 23, lastOccurred: '2024-01-28T15:38:00Z', trend: 'stable' },
  { id: 'err-3', endpoint: '/api/v1/webhooks', statusCode: 400, message: 'Invalid webhook URL', count: 87, lastOccurred: '2024-01-28T15:35:00Z', trend: 'down' },
  { id: 'err-4', endpoint: '/api/v1/qr-codes/{id}', statusCode: 404, message: 'QR code not found', count: 234, lastOccurred: '2024-01-28T15:40:00Z', trend: 'stable' }
];

const regionLatencies: RegionLatency[] = [
  { region: 'US East', latency: 45, status: 'good' },
  { region: 'US West', latency: 68, status: 'good' },
  { region: 'Europe', latency: 125, status: 'fair' },
  { region: 'Asia Pacific', latency: 185, status: 'fair' },
  { region: 'South America', latency: 210, status: 'poor' }
];

// Method colors
const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500'
};

export default function ApiPerformanceMonitor() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [latencyData, setLatencyData] = useState<TimeSeriesPoint[]>([]);
  const [throughputData, setThroughputData] = useState<TimeSeriesPoint[]>([]);
  const [errorData, setErrorData] = useState<TimeSeriesPoint[]>([]);

  // Generate initial data
  useEffect(() => {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
    setLatencyData(generateTimeSeriesData(hours, 145, 60));
    setThroughputData(generateTimeSeriesData(hours, 2800, 800));
    setErrorData(generateTimeSeriesData(hours, 0.25, 0.15));
  }, [timeRange]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // In real app, would fetch fresh data here
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good': return 'text-emerald-400 bg-emerald-500/20';
      case 'warning':
      case 'degraded':
      case 'fair': return 'text-amber-400 bg-amber-500/20';
      case 'critical':
      case 'down':
      case 'poor': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  // Get latency color
  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-emerald-400';
    if (latency < 300) return 'text-amber-400';
    return 'text-red-400';
  };

  // Render mini chart
  const renderMiniChart = (data: TimeSeriesPoint[], color: string) => {
    if (data.length === 0) return null;

    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-12" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  // Render bar chart for latency distribution
  const renderLatencyBars = (data: TimeSeriesPoint[]) => {
    if (data.length === 0) return null;

    const max = Math.max(...data.map(d => d.value));
    const recentData = data.slice(-24);

    return (
      <div className="flex items-end h-24 gap-0.5">
        {recentData.map((d, i) => {
          const height = (d.value / max) * 100;
          const isHighLatency = d.value > 200;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${
                isHighLatency ? 'bg-amber-500' : 'bg-blue-500'
              } hover:opacity-80`}
              style={{ height: `${height}%` }}
              title={`${Math.round(d.value)}ms`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Performance Monitor</h1>
              <p className="text-slate-400">Real-time API performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {(['1h', '6h', '24h', '7d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'
              }`}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
            </button>

            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Circle className={`w-2 h-2 ${autoRefresh ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-500 text-slate-500'}`} />
          Last updated: {lastUpdated.toLocaleTimeString()}
          {autoRefresh && <span className="text-slate-500">• Auto-refreshing every 30s</span>}
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {performanceMetrics.map(metric => (
            <div key={metric.id} className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {metric.id === 'error-rate' || metric.id === 'uptime'
                  ? metric.value.toFixed(2)
                  : metric.value.toLocaleString()}
                <span className="text-lg font-normal text-slate-400 ml-1">{metric.unit}</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                metric.change >= 0
                  ? (metric.id === 'error-rate' ? 'text-red-400' : 'text-emerald-400')
                  : (metric.id === 'error-rate' ? 'text-emerald-400' : 'text-red-400')
              }`}>
                {metric.change >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(metric.change)}% vs last period
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Latency Chart */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Timer className="w-5 h-5 text-cyan-400" />
                Response Time
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Avg Latency
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                  &gt;200ms
                </span>
              </div>
            </div>

            {/* Bar Chart */}
            {renderLatencyBars(latencyData)}

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-400">P50</div>
                <div className="text-xl font-bold text-emerald-400">98ms</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">P95</div>
                <div className="text-xl font-bold text-amber-400">245ms</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">P99</div>
                <div className="text-xl font-bold text-red-400">485ms</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Max</div>
                <div className="text-xl font-bold text-red-400">892ms</div>
              </div>
            </div>
          </div>

          {/* Region Latencies */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Regional Latency
            </h2>

            <div className="space-y-4">
              {regionLatencies.map(region => (
                <div key={region.region} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-slate-400">{region.region}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          region.status === 'good' ? 'bg-emerald-500' :
                          region.status === 'fair' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((region.latency / 300) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`w-16 text-right font-medium ${getLatencyColor(region.latency)}`}>
                    {region.latency}ms
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm">
              <span className="text-slate-400">Global Average</span>
              <span className="font-medium">127ms</span>
            </div>
          </div>
        </div>

        {/* Endpoint Performance */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 mb-6">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Endpoint Performance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Endpoint</th>
                  <th className="text-center px-4 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">Avg</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">P50</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">P95</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">P99</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">Requests</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-400">Error Rate</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {endpointMetrics.map((ep, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => setSelectedEndpoint(ep.endpoint)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${methodColors[ep.method]} text-white`}>
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono">{ep.endpoint}</code>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${getStatusColor(ep.status)}`}>
                        {ep.status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
                        {ep.status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
                        {ep.status === 'down' && <XCircle className="w-3 h-3" />}
                        {ep.status}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${getLatencyColor(ep.avgLatency)}`}>
                      {ep.avgLatency}ms
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300">{ep.p50}ms</td>
                    <td className="px-4 py-4 text-right text-slate-300">{ep.p95}ms</td>
                    <td className="px-4 py-4 text-right text-slate-300">{ep.p99}ms</td>
                    <td className="px-4 py-4 text-right text-slate-300">{ep.requests.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-right ${ep.errorRate > 0.2 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {ep.errorRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-6">
                        {renderMiniChart(latencyData.slice(-12), ep.status === 'healthy' ? '#10B981' : '#F59E0B')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Errors */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Recent Errors
            </h2>

            <div className="space-y-3">
              {recentErrors.map(error => (
                <div key={error.id} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className={`px-2 py-1 text-xs font-bold rounded ${
                    error.statusCode >= 500 ? 'bg-red-500/20 text-red-400' :
                    error.statusCode >= 400 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {error.statusCode}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{error.message}</div>
                    <div className="text-xs text-slate-400">{error.endpoint}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{error.count}</div>
                    <div className={`text-xs flex items-center gap-1 ${
                      error.trend === 'up' ? 'text-red-400' :
                      error.trend === 'down' ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {error.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {error.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      {error.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              View All Errors
            </button>
          </div>

          {/* System Health */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              System Health
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <div className="text-2xl font-bold mb-2">34%</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '34%' }} />
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold mb-2">68%</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mb-2">Healthy</div>
                <div className="text-xs text-slate-400">Latency: 8ms</div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Wifi className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium">CDN</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mb-2">Healthy</div>
                <div className="text-xs text-slate-400">Hit Rate: 94%</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Overall Health Score</span>
                <span className="font-bold text-emerald-400">98/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for slow spin animation */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
