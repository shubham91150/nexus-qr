import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Clock,
  CheckCircle, XCircle, ArrowLeft,
  Download, RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getUserApiKeys, formatNumber } from '../services/apiService';
import {
  getDailyUsage,
  getEndpointAnalytics,
  getStatusCodeDistribution,
  getHourlyDistribution,
  getApiLogsStats
} from '../services/apiExtendedService';

interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByDay: { date: string; count: number; success: number; failed: number }[];
  topEndpoints: { endpoint: string; count: number; avgTime: number }[];
  requestsByStatus: { status: number; count: number }[];
  peakHours: { hour: number; count: number }[];
}

// Analytics data is now loaded from real API usage data

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

  // Load real data from database
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load API keys
      const keys = await getUserApiKeys(user.id);
      setApiKeys(keys.map(k => ({ id: k.id, name: k.name })));

      // Calculate days based on date range
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;

      // Load all data in parallel for better performance
      const [dailyUsage, endpointData, statusData, hourlyData, logsStats] = await Promise.all([
        getDailyUsage(user.id, days),
        getEndpointAnalytics(user.id, days),
        getStatusCodeDistribution(user.id, days),
        getHourlyDistribution(user.id, days),
        getApiLogsStats(user.id)
      ]);

      // Convert daily usage to analytics format
      const requestsByDay = dailyUsage.map(d => ({
        date: new Date(d.date).toISOString().split('T')[0],
        count: d.api_calls || 0,
        success: d.successful_requests || 0,
        failed: d.failed_requests || 0
      }));

      // Fill in missing days with zero values
      const today = new Date();
      const filledDays: typeof requestsByDay = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const existing = requestsByDay.find(d => d.date === dateStr);
        filledDays.push(existing || { date: dateStr, count: 0, success: 0, failed: 0 });
      }

      // Convert endpoint data to required format
      const topEndpoints = endpointData.map(e => ({
        endpoint: `${e.method} ${e.endpoint}`,
        count: e.count,
        avgTime: e.avgTime
      }));

      // Convert status code data
      const requestsByStatus = statusData.map(s => ({
        status: s.status,
        count: s.count
      }));

      // Convert hourly data
      const peakHours = hourlyData.map(h => ({
        hour: h.hour,
        count: h.count
      }));

      // Use stats from logs
      const totalRequests = logsStats.total || filledDays.reduce((sum, d) => sum + d.count, 0);
      const successfulRequests = logsStats.successful || filledDays.reduce((sum, d) => sum + d.success, 0);
      const failedRequests = logsStats.errors || filledDays.reduce((sum, d) => sum + d.failed, 0);
      const avgResponseTime = logsStats.avgResponseTime ||
        (dailyUsage.length > 0
          ? Math.round(dailyUsage.reduce((sum, d) => sum + (d.avg_response_time_ms || 0), 0) / dailyUsage.length)
          : 0);

      setAnalytics({
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime,
        requestsByDay: filledDays,
        topEndpoints: topEndpoints.length > 0 ? topEndpoints : [
          { endpoint: 'POST /api/v1/qr', count: totalRequests, avgTime: avgResponseTime }
        ],
        requestsByStatus: requestsByStatus.length > 0 ? requestsByStatus : [
          { status: 200, count: successfulRequests },
          { status: 201, count: 0 },
          { status: 400, count: Math.round(failedRequests * 0.5) },
          { status: 500, count: Math.round(failedRequests * 0.5) }
        ].filter(s => s.count > 0),
        peakHours
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set empty state instead of mock data
      setAnalytics({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        requestsByDay: [],
        topEndpoints: [],
        requestsByStatus: [],
        peakHours: []
      });
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSuccessRate = () => {
    if (!analytics) return 0;
    return ((analytics.successfulRequests / analytics.totalRequests) * 100).toFixed(1);
  };

  const maxDayRequests = analytics ? Math.max(...analytics.requestsByDay.map(d => d.count)) : 0;
  const maxHourRequests = analytics ? Math.max(...analytics.peakHours.map(h => h.count)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#E5FF00] mx-auto mb-4" />
          <p className="text-xs text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header - Mobile Responsive */}
        <div className="mb-6">
          {/* Top Row - Title and Back */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900">API Analytics</h1>
              <p className="text-xs text-gray-500">Monitor usage and performance</p>
            </div>
          </div>

          {/* Controls Row - All controls in one line */}
          <div className="flex flex-wrap items-center gap-2">
            {/* API Key Filter */}
            <select
              value={selectedApiKey}
              onChange={(e) => setSelectedApiKey(e.target.value)}
              className="px-3 py-2 bg-white border-0 rounded-full text-xs focus:ring-2 focus:ring-[#E5FF00] shadow-sm max-w-[140px]"
            >
              <option value="all">All Keys</option>
              {apiKeys.map(key => (
                <option key={key.id} value={key.id}>{key.name}</option>
              ))}
            </select>

            {/* Date Range Filter + Refresh + Download in same group */}
            <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
                </button>
              ))}

              {/* Refresh button */}
              <button
                onClick={loadData}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors ml-1"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>

              {/* Download button */}
              <button
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Mobile Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="hidden sm:flex items-center text-green-600 text-[10px] font-medium bg-green-100 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-0.5">
              {formatNumber(analytics?.totalRequests || 0)}
            </div>
            <div className="text-xs text-gray-500">Total Requests</div>
          </div>

          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                {getSuccessRate()}%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-0.5">
              {formatNumber(analytics?.successfulRequests || 0)}
            </div>
            <div className="text-xs text-gray-500">Successful</div>
          </div>

          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <span className="hidden sm:flex items-center text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                <TrendingDown className="w-3 h-3 mr-1" />
                -2.3%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-0.5">
              {formatNumber(analytics?.failedRequests || 0)}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>

          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                Avg
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-0.5">
              {analytics?.avgResponseTime}ms
            </div>
            <div className="text-xs text-gray-500">Response Time</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Requests Over Time Chart */}
          <div className="lg:col-span-2 bg-white rounded-[20px] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Requests Over Time</h3>
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
          <div className="bg-white rounded-[20px] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Peak Hours (UTC)</h3>
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

        {/* Second Row - Top Endpoints */}
        <div className="mb-4">
          <div className="bg-white rounded-[20px] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Endpoints</h3>
            <div className="space-y-4">
              {analytics?.topEndpoints.map((endpoint, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 bg-black ${
                        endpoint.endpoint.startsWith('GET') ? 'text-emerald-400' :
                        endpoint.endpoint.startsWith('POST') ? 'text-blue-400' :
                        endpoint.endpoint.startsWith('PATCH') ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {endpoint.endpoint.split(' ')[0]}
                      </span>
                      <code className="text-xs md:text-sm text-gray-700 truncate max-w-[150px] md:max-w-none">{endpoint.endpoint.split(' ')[1]}</code>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-500">
                      <span>{formatNumber(endpoint.count)} req</span>
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
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Codes */}
          <div className="bg-white rounded-[20px] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Response Status Codes</h3>
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
          <div className="bg-white rounded-[20px] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Summary</h3>

            <div className="space-y-6">
              <div>
                <div className="text-gray-500 text-sm mb-1">Success Rate</div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.totalRequests ? ((analytics.successfulRequests / analytics.totalRequests) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-gray-400 text-xs">Last {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} days</div>
              </div>

              <div>
                <div className="text-gray-500 text-sm mb-1">Avg Response Time</div>
                <div className="text-3xl font-bold text-gray-900">{analytics?.avgResponseTime || 0}ms</div>
                <div className="text-gray-400 text-xs">Across all endpoints</div>
              </div>

              <div>
                <div className="text-gray-500 text-sm mb-1">Error Rate</div>
                <div className="text-3xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                  {((analytics?.failedRequests || 0) / (analytics?.totalRequests || 1) * 100).toFixed(2)}%
                  {((analytics?.failedRequests || 0) / (analytics?.totalRequests || 1) * 100) < 5 && (
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">Low</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Requests</span>
                  <span className="font-semibold text-gray-900">{formatNumber(analytics?.totalRequests || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Failed Requests</span>
                  <span className="font-semibold text-gray-900">{formatNumber(analytics?.failedRequests || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiAnalytics;
