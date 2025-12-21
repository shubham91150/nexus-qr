import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Clock, Globe,
  Smartphone, Monitor, CheckCircle, XCircle, ArrowLeft,
  Calendar, Filter, Download, RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getUserApiKeys, getApiKeyUsage, formatNumber } from '../services/apiService';

interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByDay: { date: string; count: number; success: number; failed: number }[];
  topEndpoints: { endpoint: string; count: number; avgTime: number }[];
  requestsByCountry: { country: string; code: string; count: number }[];
  requestsByDevice: { device: string; count: number; percentage: number }[];
  requestsByStatus: { status: number; count: number }[];
  peakHours: { hour: number; count: number }[];
}

// Mock analytics data for demo
const generateMockAnalytics = (): AnalyticsData => {
  const today = new Date();
  const requestsByDay = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 500) + 100;
    const failed = Math.floor(count * (Math.random() * 0.05));
    requestsByDay.push({
      date: date.toISOString().split('T')[0],
      count,
      success: count - failed,
      failed
    });
  }

  const peakHours = [];
  for (let i = 0; i < 24; i++) {
    peakHours.push({
      hour: i,
      count: Math.floor(Math.random() * 200) + (i >= 9 && i <= 17 ? 300 : 50)
    });
  }

  return {
    totalRequests: requestsByDay.reduce((sum, d) => sum + d.count, 0),
    successfulRequests: requestsByDay.reduce((sum, d) => sum + d.success, 0),
    failedRequests: requestsByDay.reduce((sum, d) => sum + d.failed, 0),
    avgResponseTime: 145,
    requestsByDay,
    topEndpoints: [
      { endpoint: 'POST /api/v1/qr', count: 4520, avgTime: 230 },
      { endpoint: 'GET /api/v1/qr/{id}', count: 3890, avgTime: 45 },
      { endpoint: 'GET /api/v1/qr', count: 2340, avgTime: 120 },
      { endpoint: 'GET /api/v1/qr/{id}/analytics', count: 1890, avgTime: 180 },
      { endpoint: 'PATCH /api/v1/qr/{id}', count: 890, avgTime: 95 },
      { endpoint: 'DELETE /api/v1/qr/{id}', count: 234, avgTime: 55 },
    ],
    requestsByCountry: [
      { country: 'United States', code: 'US', count: 5420 },
      { country: 'United Kingdom', code: 'GB', count: 2340 },
      { country: 'Germany', code: 'DE', count: 1890 },
      { country: 'India', code: 'IN', count: 1560 },
      { country: 'Japan', code: 'JP', count: 980 },
      { country: 'Canada', code: 'CA', count: 870 },
      { country: 'Australia', code: 'AU', count: 650 },
      { country: 'France', code: 'FR', count: 540 },
    ],
    requestsByDevice: [
      { device: 'Desktop', count: 8500, percentage: 62 },
      { device: 'Mobile', count: 4200, percentage: 31 },
      { device: 'Tablet', count: 950, percentage: 7 },
    ],
    requestsByStatus: [
      { status: 200, count: 12500 },
      { status: 201, count: 4520 },
      { status: 400, count: 234 },
      { status: 401, count: 156 },
      { status: 404, count: 89 },
      { status: 429, count: 45 },
      { status: 500, count: 12 },
    ],
    peakHours
  };
};

interface ApiAnalyticsProps {
  onBack: () => void;
}

const ApiAnalytics: React.FC<ApiAnalyticsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedApiKey, setSelectedApiKey] = useState<string>('all');
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [user, dateRange]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load API keys
    const keys = await getUserApiKeys(user.id);
    setApiKeys(keys.map(k => ({ id: k.id, name: k.name })));

    // In production, this would fetch real analytics
    // For demo, using mock data
    await new Promise(resolve => setTimeout(resolve, 800));
    setAnalytics(generateMockAnalytics());
    setLoading(false);
  };

  const getSuccessRate = () => {
    if (!analytics) return 0;
    return ((analytics.successfulRequests / analytics.totalRequests) * 100).toFixed(1);
  };

  const maxDayRequests = analytics ? Math.max(...analytics.requestsByDay.map(d => d.count)) : 0;
  const maxHourRequests = analytics ? Math.max(...analytics.peakHours.map(h => h.count)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                API Analytics
              </h1>
              <p className="text-gray-500 text-sm">Monitor your API usage and performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* API Key Filter */}
            <select
              value={selectedApiKey}
              onChange={(e) => setSelectedApiKey(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All API Keys</option>
              {apiKeys.map(key => (
                <option key={key.id} value={key.id}>{key.name}</option>
              ))}
            </select>

            {/* Date Range Filter */}
            <div className="flex bg-white border border-gray-200 rounded-xl p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12.5%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(analytics?.totalRequests || 0)}
            </div>
            <div className="text-gray-500 text-sm">Total Requests</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-green-600 text-sm font-medium">
                {getSuccessRate()}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(analytics?.successfulRequests || 0)}
            </div>
            <div className="text-gray-500 text-sm">Successful</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <span className="flex items-center text-red-600 text-sm font-medium">
                <TrendingDown className="w-4 h-4 mr-1" />
                -2.3%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(analytics?.failedRequests || 0)}
            </div>
            <div className="text-gray-500 text-sm">Failed</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-purple-600 text-sm font-medium">
                Avg
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analytics?.avgResponseTime}ms
            </div>
            <div className="text-gray-500 text-sm">Response Time</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Requests Over Time Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Requests Over Time</h3>
            <div className="h-64 flex items-end gap-1">
              {analytics?.requestsByDay.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full flex flex-col"
                    style={{ height: `${(day.count / maxDayRequests) * 200}px` }}
                  >
                    <div
                      className="bg-red-400 w-full rounded-t"
                      style={{ height: `${(day.failed / day.count) * 100}%` }}
                    />
                    <div
                      className="bg-indigo-500 w-full flex-1 rounded-b"
                    />
                  </div>
                  {i % 5 === 0 && (
                    <span className="text-[10px] text-gray-400 rotate-45 origin-left mt-2">
                      {day.date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded" />
                <span className="text-sm text-gray-600">Successful</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours (UTC)</h3>
            <div className="space-y-2">
              {analytics?.peakHours.slice(6, 22).map((hour) => (
                <div key={hour.hour} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12">
                    {hour.hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${(hour.count / maxHourRequests) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {formatNumber(hour.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Endpoints */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Endpoints</h3>
            <div className="space-y-4">
              {analytics?.topEndpoints.map((endpoint, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        endpoint.endpoint.startsWith('GET') ? 'bg-emerald-100 text-emerald-700' :
                        endpoint.endpoint.startsWith('POST') ? 'bg-blue-100 text-blue-700' :
                        endpoint.endpoint.startsWith('PATCH') ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {endpoint.endpoint.split(' ')[0]}
                      </span>
                      <code className="text-sm text-gray-700">{endpoint.endpoint.split(' ')[1]}</code>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatNumber(endpoint.count)} requests</span>
                      <span>Avg: {endpoint.avgTime}ms</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {((endpoint.count / (analytics?.totalRequests || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Geographic Distribution
            </h3>
            <div className="space-y-3">
              {analytics?.requestsByCountry.map((country, i) => {
                const maxCount = analytics.requestsByCountry[0].count;
                const percentage = (country.count / (analytics.totalRequests || 1)) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{getCountryFlag(country.code)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{country.country}</span>
                        <span className="text-sm text-gray-500">{formatNumber(country.count)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          style={{ width: `${(country.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              Device Types
            </h3>
            <div className="space-y-4">
              {analytics?.requestsByDevice.map((device, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {device.device === 'Desktop' && <Monitor className="w-4 h-4 text-gray-500" />}
                      {device.device === 'Mobile' && <Smartphone className="w-4 h-4 text-gray-500" />}
                      {device.device === 'Tablet' && <Monitor className="w-4 h-4 text-gray-500" />}
                      <span className="text-sm font-medium text-gray-700">{device.device}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{device.percentage}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-purple-500' : 'bg-pink-500'
                      }`}
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart Visual */}
            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {analytics?.requestsByDevice.reduce((acc, device, i) => {
                    const startAngle = acc.angle;
                    const sweepAngle = (device.percentage / 100) * 360;
                    const endAngle = startAngle + sweepAngle;

                    const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 50 + 45 * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = 50 + 45 * Math.sin((endAngle * Math.PI) / 180);

                    const largeArc = sweepAngle > 180 ? 1 : 0;

                    acc.paths.push(
                      <path
                        key={i}
                        d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={i === 0 ? '#6366F1' : i === 1 ? '#A855F7' : '#EC4899'}
                      />
                    );
                    acc.angle = endAngle;
                    return acc;
                  }, { angle: 0, paths: [] as JSX.Element[] }).paths}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Status Codes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Status Codes</h3>
            <div className="space-y-3">
              {analytics?.requestsByStatus.map((status) => {
                const percentage = (status.count / (analytics.totalRequests || 1)) * 100;
                const isSuccess = status.status >= 200 && status.status < 300;
                const isClientError = status.status >= 400 && status.status < 500;
                const isServerError = status.status >= 500;

                return (
                  <div key={status.status} className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${
                      isSuccess ? 'bg-green-100 text-green-700' :
                      isClientError ? 'bg-amber-100 text-amber-700' :
                      isServerError ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {status.status}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isSuccess ? 'bg-green-500' :
                            isClientError ? 'bg-amber-500' :
                            isServerError ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 w-16 text-right">
                      {formatNumber(status.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-6">Performance Summary</h3>

            <div className="space-y-6">
              <div>
                <div className="text-white/70 text-sm mb-1">Uptime</div>
                <div className="text-3xl font-bold">99.98%</div>
                <div className="text-white/60 text-xs">Last 30 days</div>
              </div>

              <div>
                <div className="text-white/70 text-sm mb-1">P95 Response Time</div>
                <div className="text-3xl font-bold">285ms</div>
                <div className="text-white/60 text-xs">95th percentile</div>
              </div>

              <div>
                <div className="text-white/70 text-sm mb-1">Error Rate</div>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {((analytics?.failedRequests || 0) / (analytics?.totalRequests || 1) * 100).toFixed(2)}%
                  <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded">Low</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Rate Limit Hits</span>
                  <span className="font-semibold">45</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-white/70">Unique IPs</span>
                  <span className="font-semibold">1,234</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for country flags
function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    US: '🇺🇸',
    GB: '🇬🇧',
    DE: '🇩🇪',
    IN: '🇮🇳',
    JP: '🇯🇵',
    CA: '🇨🇦',
    AU: '🇦🇺',
    FR: '🇫🇷'
  };
  return flags[code] || '🌐';
}

export default ApiAnalytics;
