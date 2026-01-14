'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Settings,
  CreditCard,
  Calendar,
  Clock,
  Zap,
  Database,
  Globe,
  ChevronRight,
  Check,
  RefreshCw,
  Download,
  Activity,
  Gauge,
  Package,
  Mail,
  Smartphone,
  ArrowLeft
} from 'lucide-react';
import {
  getUsageMetrics,
  getUsageAlerts,
  getDailyUsage,
  getAlertSettings,
  updateAlertSettings,
  acknowledgeAlert as acknowledgeAlertApi
} from '../services/apiExtendedService';

interface ApiUsageQuotaProps {
  onBack: () => void;
  userId?: string;
}

interface UsageMetric {
  id: string;
  name: string;
  current: number;
  limit: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend: number;
  resetDate: string;
}

interface UsageAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  metric: string;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

interface DailyUsage {
  date: string;
  apiCalls: number;
  qrCodes: number;
  bandwidth: number;
}

const defaultMetrics: UsageMetric[] = [
  { id: 'api-calls', name: 'API Calls', current: 0, limit: 1000, unit: 'calls', icon: Zap, color: 'text-blue-600', bgColor: 'bg-blue-100', trend: 0, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
  { id: 'qr-codes', name: 'QR Codes', current: 0, limit: 10000, unit: 'codes', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-100', trend: 0, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
  { id: 'bandwidth', name: 'Bandwidth', current: 0, limit: 50, unit: 'GB', icon: Globe, color: 'text-purple-600', bgColor: 'bg-purple-100', trend: 0, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
  { id: 'storage', name: 'Storage', current: 0, limit: 10, unit: 'GB', icon: Database, color: 'text-amber-600', bgColor: 'bg-amber-100', trend: 0, resetDate: 'N/A' },
  { id: 'webhooks', name: 'Webhooks', current: 0, limit: 50000, unit: 'calls', icon: Bell, color: 'text-pink-600', bgColor: 'bg-pink-100', trend: 0, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
  { id: 'analytics', name: 'Analytics', current: 0, limit: 10000, unit: 'queries', icon: BarChart3, color: 'text-cyan-600', bgColor: 'bg-cyan-100', trend: 0, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] }
];

const planDetails = {
  name: 'Professional',
  price: 99,
  billingCycle: 'monthly',
  nextBilling: '2024-02-01',
  features: ['100,000 API calls/month', '1,000 QR codes/month', '10 GB bandwidth', '5 GB storage']
};

export default function ApiUsageQuota({ onBack, userId }: ApiUsageQuotaProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [metrics, setMetrics] = useState<UsageMetric[]>(defaultMetrics);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    warning: 75, critical: 90, emailNotify: true, slackNotify: false, webhookNotify: true
  });

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const [alertsData, metricsData, fetchedDailyData, settingsData] = await Promise.all([
        getUsageAlerts(userId),
        getUsageMetrics(userId),
        getDailyUsage(userId, 7),
        getAlertSettings(userId),
      ]);

      setAlerts(alertsData.map(a => ({
        id: a.id, type: a.alert_type, message: a.message, metric: a.metric,
        threshold: a.threshold || 0, timestamp: a.created_at, acknowledged: a.acknowledged,
      })));

      const transformedMetrics: UsageMetric[] = [
        { id: 'api-calls', name: 'API Calls', current: metricsData.apiCalls.current, limit: metricsData.apiCalls.limit, unit: 'calls', icon: Zap, color: 'text-blue-600', bgColor: 'bg-blue-100', trend: metricsData.apiCalls.trend, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
        { id: 'qr-codes', name: 'QR Codes', current: metricsData.qrCodes.current, limit: metricsData.qrCodes.limit, unit: 'codes', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-100', trend: metricsData.qrCodes.trend, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
        { id: 'bandwidth', name: 'Bandwidth', current: metricsData.bandwidth.current, limit: metricsData.bandwidth.limit, unit: 'GB', icon: Globe, color: 'text-purple-600', bgColor: 'bg-purple-100', trend: metricsData.bandwidth.trend, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
        { id: 'storage', name: 'Storage', current: metricsData.storage.current, limit: metricsData.storage.limit, unit: 'GB', icon: Database, color: 'text-amber-600', bgColor: 'bg-amber-100', trend: metricsData.storage.trend, resetDate: 'N/A' },
        { id: 'webhooks', name: 'Webhooks', current: metricsData.webhooks.current, limit: metricsData.webhooks.limit, unit: 'calls', icon: Bell, color: 'text-pink-600', bgColor: 'bg-pink-100', trend: metricsData.webhooks.trend, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] },
        { id: 'analytics', name: 'Analytics', current: metricsData.analytics.current, limit: metricsData.analytics.limit, unit: 'queries', icon: BarChart3, color: 'text-cyan-600', bgColor: 'bg-cyan-100', trend: metricsData.analytics.trend, resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] }
      ];
      setMetrics(transformedMetrics);

      if (fetchedDailyData.length > 0) {
        setDailyData(fetchedDailyData.map(d => ({
          date: d.date, apiCalls: d.api_calls, qrCodes: d.qr_codes_created || 0,
          bandwidth: (d.bandwidth_bytes || 0) / (1024 * 1024 * 1024)
        })));
      } else {
        const days: DailyUsage[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          days.push({ date: date.toISOString().split('T')[0], apiCalls: 0, qrCodes: 0, bandwidth: 0 });
        }
        setDailyData(days);
      }

      if (settingsData) {
        setAlertThresholds({
          warning: settingsData.warning_threshold, critical: settingsData.critical_threshold,
          emailNotify: settingsData.email_notify, slackNotify: settingsData.slack_notify,
          webhookNotify: settingsData.webhook_notify,
        });
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUsagePercentage = (current: number, limit: number) => Math.min((current / limit) * 100, 100);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-amber-600 bg-amber-100';
    return 'text-emerald-600 bg-emerald-100';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const acknowledgeAlert = async (alertId: string) => {
    if (userId) await acknowledgeAlertApi(alertId);
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const saveAlertSettings = async () => {
    if (userId) {
      await updateAlertSettings(userId, {
        warning_threshold: alertThresholds.warning, critical_threshold: alertThresholds.critical,
        email_notify: alertThresholds.emailNotify, slack_notify: alertThresholds.slackNotify,
        webhook_notify: alertThresholds.webhookNotify,
      });
    }
    setShowAlertSettings(false);
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const daysRemaining = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate());

  const getProjectedUsage = (current: number, limit: number) => {
    const daysPassed = new Date().getDate();
    const dailyAvg = current / daysPassed;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return Math.min(dailyAvg * daysInMonth, limit * 1.5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-xs text-gray-500">Loading usage data...</p>
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
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Gauge className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Usage & Quota</h1>
              <p className="text-xs text-gray-500">Monitor API usage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white rounded-full p-1 shadow-sm">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    selectedPeriod === period ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
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

        {/* Billing Period Banner */}
        <div className="bg-[#E5FF00] rounded-[20px] p-4 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#E5FF00]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Current Billing Period</div>
              <div className="text-xs text-gray-700">{daysRemaining} days remaining • Resets {planDetails.nextBilling}</div>
            </div>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors">
            View Billing
          </button>
        </div>

        {/* Active Alerts */}
        {alerts.filter(a => !a.acknowledged).length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-[20px] shadow-sm ${
                  alert.type === 'critical' ? 'bg-red-50' : alert.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    alert.type === 'critical' ? 'bg-red-100' : alert.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.type === 'critical' ? 'text-red-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Usage Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {metrics.map(metric => {
            const percentage = getUsagePercentage(metric.current, metric.limit);
            const projected = getProjectedUsage(metric.current, metric.limit);
            const projectedPercentage = (projected / metric.limit) * 100;

            return (
              <div key={metric.id} className="bg-white rounded-[20px] p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.bgColor}`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(percentage)}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="text-sm font-semibold text-gray-900 mb-1">{metric.name}</div>
                <div className="text-lg font-bold text-gray-900 mb-2">
                  {formatNumber(metric.current)}
                  <span className="text-xs font-normal text-gray-500 ml-1">/ {formatNumber(metric.limit)} {metric.unit}</span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{formatNumber(metric.limit - metric.current)} remaining</span>
                  <span className={`flex items-center gap-1 ${metric.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metric.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(metric.trend)}%
                  </span>
                </div>

                {projectedPercentage > 100 && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-[8px] flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] text-amber-700">May exceed limit</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Usage Chart & Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Usage Chart */}
          <div className="lg:col-span-2 bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Usage Trend</div>
                <div className="text-xs text-gray-500">Last 7 days</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> API Calls</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> QR Codes</span>
            </div>

            <div className="flex items-end justify-between h-32 gap-2">
              {dailyData.map((day, i) => {
                const maxCalls = Math.max(...dailyData.map(d => d.apiCalls), 1);
                const callsHeight = (day.apiCalls / maxCalls) * 100;
                const qrHeight = (day.qrCodes / 50) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center gap-1 h-24">
                      <div className="w-3 bg-blue-500 rounded-t transition-all" style={{ height: `${callsHeight}%`, minHeight: '4px' }} />
                      <div className="w-3 bg-emerald-500 rounded-t transition-all" style={{ height: `${qrHeight}%`, minHeight: '4px' }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Avg Daily Calls</div>
                <div className="text-lg font-bold text-gray-900">{formatNumber(Math.round(dailyData.reduce((a, b) => a + b.apiCalls, 0) / dailyData.length))}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Avg Daily QR</div>
                <div className="text-lg font-bold text-gray-900">{Math.round(dailyData.reduce((a, b) => a + b.qrCodes, 0) / dailyData.length)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Peak Day</div>
                <div className="text-lg font-bold text-gray-900">Thursday</div>
              </div>
            </div>
          </div>

          {/* Current Plan */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Current Plan</div>
                <div className="text-xs text-gray-500">Billing info</div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-[12px] p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-900">{planDetails.name}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500 text-white">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                ${planDetails.price}<span className="text-xs font-normal text-gray-500">/{planDetails.billingCycle}</span>
              </div>
              <div className="text-xs text-gray-500">Next billing: {planDetails.nextBilling}</div>
            </div>

            <div className="space-y-2 mb-4">
              {planDetails.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <button className="w-full py-3 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Usage Alerts</div>
                <div className="text-xs text-gray-500">Get notified on limits</div>
              </div>
            </div>
            <button
              onClick={() => setShowAlertSettings(!showAlertSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>

          {showAlertSettings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-4">Alert Thresholds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Warning threshold</span>
                      <span className="text-xs font-medium text-amber-600">{alertThresholds.warning}%</span>
                    </label>
                    <input
                      type="range" min="50" max="95"
                      value={alertThresholds.warning}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, warning: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Critical threshold</span>
                      <span className="text-xs font-medium text-red-600">{alertThresholds.critical}%</span>
                    </label>
                    <input
                      type="range" min="60" max="100"
                      value={alertThresholds.critical}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, critical: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-4">Notification Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Email</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.emailNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, emailNotify: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Slack</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.slackNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, slackNotify: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Webhook</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.webhookNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, webhookNotify: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500"
                    />
                  </label>
                </div>
                <button
                  onClick={saveAlertSettings}
                  className="w-full mt-4 py-3 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-[12px]">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Warning</div>
                  <div className="text-xs text-gray-500">At {alertThresholds.warning}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-[12px]">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Critical</div>
                  <div className="text-xs text-gray-500">At {alertThresholds.critical}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-[12px]">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Channels</div>
                  <div className="text-xs text-gray-500">
                    {[alertThresholds.emailNotify && 'Email', alertThresholds.slackNotify && 'Slack', alertThresholds.webhookNotify && 'Webhook'].filter(Boolean).join(', ') || 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
