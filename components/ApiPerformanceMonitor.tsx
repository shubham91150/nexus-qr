'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  Timer,
  ArrowLeft,
  Cpu,
  HardDrive,
  Wifi,
  ChevronRight
} from 'lucide-react';
import {
  getPerformanceMetrics,
  getEndpointPerformance,
  getApiErrors
} from '../services/apiExtendedService';

interface ApiPerformanceMonitorProps {
  onBack: () => void;
  userId?: string;
}

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

interface RegionLatency {
  region: string;
  latency: number;
  status: 'good' | 'fair' | 'poor';
}

const performanceMetrics: PerformanceMetric[] = [
  { id: 'avg-latency', name: 'Avg Response', value: 142, unit: 'ms', change: -8.5, status: 'healthy', icon: Timer, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'throughput', name: 'Requests/min', value: 2847, unit: 'req', change: 12.3, status: 'healthy', icon: Zap, color: 'bg-blue-100 text-blue-600' },
  { id: 'error-rate', name: 'Error Rate', value: 0.24, unit: '%', change: -0.08, status: 'healthy', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { id: 'uptime', name: 'Uptime', value: 99.98, unit: '%', change: 0.01, status: 'healthy', icon: CheckCircle2, color: 'bg-purple-100 text-purple-600' }
];

const endpointMetrics: EndpointMetric[] = [
  { endpoint: '/api/v1/qr-codes', method: 'POST', avgLatency: 185, p50: 142, p95: 320, p99: 485, requests: 15420, errorRate: 0.12, status: 'healthy' },
  { endpoint: '/api/v1/qr-codes', method: 'GET', avgLatency: 45, p50: 38, p95: 85, p99: 120, requests: 28540, errorRate: 0.05, status: 'healthy' },
  { endpoint: '/api/v1/qr-codes/{id}', method: 'GET', avgLatency: 52, p50: 42, p95: 98, p99: 145, requests: 42180, errorRate: 0.08, status: 'healthy' },
  { endpoint: '/api/v1/analytics/{id}', method: 'GET', avgLatency: 285, p50: 210, p95: 520, p99: 780, requests: 8920, errorRate: 0.18, status: 'degraded' },
];

const recentErrors: ErrorEntry[] = [
  { id: 'err-1', endpoint: '/api/v1/qr-codes', statusCode: 429, message: 'Rate limit exceeded', count: 145, lastOccurred: '2024-01-28T15:42:00Z', trend: 'up' },
  { id: 'err-2', endpoint: '/api/v1/analytics/{id}', statusCode: 500, message: 'Internal server error', count: 23, lastOccurred: '2024-01-28T15:38:00Z', trend: 'stable' },
  { id: 'err-3', endpoint: '/api/v1/webhooks', statusCode: 400, message: 'Invalid webhook URL', count: 87, lastOccurred: '2024-01-28T15:35:00Z', trend: 'down' },
];

const regionLatencies: RegionLatency[] = [
  { region: 'US East', latency: 45, status: 'good' },
  { region: 'US West', latency: 68, status: 'good' },
  { region: 'Europe', latency: 125, status: 'fair' },
  { region: 'Asia Pacific', latency: 185, status: 'fair' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700'
};

export default function ApiPerformanceMonitor({ onBack, userId }: ApiPerformanceMonitorProps) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [endpoints, setEndpoints] = useState<EndpointMetric[]>(endpointMetrics);
  const [errors, setErrors] = useState<ErrorEntry[]>(recentErrors);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [endpointData, errorData] = await Promise.all([
        getEndpointPerformance(userId),
        getApiErrors(userId, 10)
      ]);
      if (endpointData.length > 0) setEndpoints(endpointData);
      if (errorData.length > 0) {
        setErrors(errorData.map(e => ({
          id: e.id,
          endpoint: e.endpoint,
          statusCode: e.status_code,
          message: e.error_message || 'Unknown error',
          count: e.error_count,
          lastOccurred: e.last_occurred,
          trend: e.trend
        })));
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good': return 'bg-emerald-100 text-emerald-700';
      case 'warning':
      case 'degraded':
      case 'fair': return 'bg-amber-100 text-amber-700';
      case 'critical':
      case 'down':
      case 'poor': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-emerald-600';
    if (latency < 300) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-xs text-gray-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Performance Monitor</h1>
              <p className="text-xs text-gray-500">Real-time API metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white rounded-full p-1 shadow-sm">
              {(['1h', '6h', '24h', '7d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    timeRange === range
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Download className="w-3 h-3 text-gray-600" />
              </div>
              Export
            </button>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {performanceMetrics.map(metric => (
            <div key={metric.id} className="bg-white rounded-[20px] p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.color}`}>
                  <metric.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.id === 'error-rate' || metric.id === 'uptime'
                  ? metric.value.toFixed(2)
                  : metric.value.toLocaleString()}
                <span className="text-xs font-normal text-gray-500 ml-1">{metric.unit}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs ${
                metric.change >= 0
                  ? (metric.id === 'error-rate' ? 'text-red-600' : 'text-emerald-600')
                  : (metric.id === 'error-rate' ? 'text-emerald-600' : 'text-red-600')
              }`}>
                {metric.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(metric.change)}%
              </div>
            </div>
          ))}
        </div>

        {/* Response Time & Region Latency */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Response Time Card */}
          <div className="lg:col-span-2 bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Response Time</div>
                <div className="text-xs text-gray-500">Latency distribution</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">P50</div>
                <div className="text-lg font-bold text-emerald-600">98ms</div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">P95</div>
                <div className="text-lg font-bold text-amber-600">245ms</div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">P99</div>
                <div className="text-lg font-bold text-red-600">485ms</div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Max</div>
                <div className="text-lg font-bold text-red-600">892ms</div>
              </div>
            </div>
          </div>

          {/* Regional Latency Card */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Regional Latency</div>
                <div className="text-xs text-gray-500">By location</div>
              </div>
            </div>
            <div className="space-y-3">
              {regionLatencies.map(region => (
                <div key={region.region} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-20">{region.region}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        region.status === 'good' ? 'bg-emerald-500' :
                        region.status === 'fair' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((region.latency / 300) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-12 text-right ${getLatencyColor(region.latency)}`}>
                    {region.latency}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Endpoint Performance */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm mb-4">
          <div className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Server className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Endpoint Performance</div>
              <div className="text-xs text-gray-500">{endpoints.length} endpoints tracked</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Endpoint</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Avg</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">P95</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Requests</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Error %</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${methodColors[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="text-xs text-gray-700">{ep.endpoint}</code>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(ep.status)}`}>
                        {ep.status}
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-right text-xs font-medium ${getLatencyColor(ep.avgLatency)}`}>
                      {ep.avgLatency}ms
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-600">{ep.p95}ms</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-600">{ep.requests.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right text-xs ${ep.errorRate > 0.2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {ep.errorRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Errors & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Errors */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Recent Errors</div>
                <div className="text-xs text-gray-500">Last 24 hours</div>
              </div>
            </div>
            <div className="space-y-3">
              {errors.map(error => (
                <div key={error.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-[12px]">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    error.statusCode >= 500 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {error.statusCode}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{error.message}</div>
                    <div className="text-[10px] text-gray-500 truncate">{error.endpoint}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-900">{error.count}</div>
                    <div className={`text-[10px] flex items-center gap-1 justify-end ${
                      error.trend === 'up' ? 'text-red-600' :
                      error.trend === 'down' ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {error.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {error.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      {error.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">System Health</div>
                <div className="text-xs text-gray-500">Infrastructure status</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-[12px] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Cpu className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">CPU</span>
                </div>
                <div className="text-lg font-bold text-gray-900 mb-1">34%</div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '34%' }} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <HardDrive className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Memory</span>
                </div>
                <div className="text-lg font-bold text-gray-900 mb-1">68%</div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Database className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Database</span>
                </div>
                <div className="text-sm font-bold text-emerald-600">Healthy</div>
                <div className="text-[10px] text-gray-500">Latency: 8ms</div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <Wifi className="w-3 h-3 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">CDN</span>
                </div>
                <div className="text-sm font-bold text-emerald-600">Healthy</div>
                <div className="text-[10px] text-gray-500">Hit Rate: 94%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
