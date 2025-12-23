'use client';

import React, { useState } from 'react';
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
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Check,
  X,
  Info,
  RefreshCw,
  Download,
  Filter,
  MoreVertical,
  Shield,
  Activity,
  PieChart,
  Target,
  Gauge,
  Package,
  Users,
  FileText,
  Mail,
  Smartphone,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

interface ApiUsageQuotaProps {
  onBack: () => void;
}

// Types
interface UsageMetric {
  id: string;
  name: string;
  current: number;
  limit: number;
  unit: string;
  icon: React.ElementType;
  color: string;
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

interface BillingOverage {
  metric: string;
  overage: number;
  rate: number;
  cost: number;
}

interface DailyUsage {
  date: string;
  apiCalls: number;
  qrCodes: number;
  bandwidth: number;
}

// Mock data
const usageMetrics: UsageMetric[] = [
  {
    id: 'api-calls',
    name: 'API Calls',
    current: 78542,
    limit: 100000,
    unit: 'calls',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    trend: 12.5,
    resetDate: '2024-02-01'
  },
  {
    id: 'qr-codes',
    name: 'QR Codes Created',
    current: 847,
    limit: 1000,
    unit: 'codes',
    icon: Package,
    color: 'from-emerald-500 to-teal-600',
    trend: 8.2,
    resetDate: '2024-02-01'
  },
  {
    id: 'bandwidth',
    name: 'Bandwidth',
    current: 4.2,
    limit: 10,
    unit: 'GB',
    icon: Globe,
    color: 'from-purple-500 to-violet-600',
    trend: -3.1,
    resetDate: '2024-02-01'
  },
  {
    id: 'storage',
    name: 'Storage Used',
    current: 2.8,
    limit: 5,
    unit: 'GB',
    icon: Database,
    color: 'from-amber-500 to-orange-600',
    trend: 5.4,
    resetDate: 'N/A'
  },
  {
    id: 'webhooks',
    name: 'Webhook Calls',
    current: 12450,
    limit: 50000,
    unit: 'calls',
    icon: Bell,
    color: 'from-pink-500 to-rose-600',
    trend: 22.1,
    resetDate: '2024-02-01'
  },
  {
    id: 'analytics',
    name: 'Analytics Queries',
    current: 3240,
    limit: 10000,
    unit: 'queries',
    icon: BarChart3,
    color: 'from-cyan-500 to-blue-600',
    trend: 15.8,
    resetDate: '2024-02-01'
  }
];

const usageAlerts: UsageAlert[] = [
  {
    id: 'alert-1',
    type: 'warning',
    message: 'QR Codes usage is at 84.7% of monthly limit',
    metric: 'QR Codes',
    threshold: 80,
    timestamp: '2024-01-28T10:30:00Z',
    acknowledged: false
  },
  {
    id: 'alert-2',
    type: 'critical',
    message: 'API Calls approaching limit (78.5%)',
    metric: 'API Calls',
    threshold: 75,
    timestamp: '2024-01-28T09:15:00Z',
    acknowledged: true
  },
  {
    id: 'alert-3',
    type: 'info',
    message: 'Webhook usage increased by 22% this week',
    metric: 'Webhooks',
    threshold: 0,
    timestamp: '2024-01-27T14:00:00Z',
    acknowledged: true
  }
];

const dailyUsage: DailyUsage[] = [
  { date: '2024-01-22', apiCalls: 2845, qrCodes: 28, bandwidth: 0.14 },
  { date: '2024-01-23', apiCalls: 3120, qrCodes: 35, bandwidth: 0.16 },
  { date: '2024-01-24', apiCalls: 2956, qrCodes: 31, bandwidth: 0.15 },
  { date: '2024-01-25', apiCalls: 3450, qrCodes: 42, bandwidth: 0.18 },
  { date: '2024-01-26', apiCalls: 2890, qrCodes: 25, bandwidth: 0.13 },
  { date: '2024-01-27', apiCalls: 3210, qrCodes: 38, bandwidth: 0.17 },
  { date: '2024-01-28', apiCalls: 3542, qrCodes: 45, bandwidth: 0.19 }
];

const planDetails = {
  name: 'Professional',
  price: 99,
  billingCycle: 'monthly',
  nextBilling: '2024-02-01',
  features: [
    '100,000 API calls/month',
    '1,000 QR codes/month',
    '10 GB bandwidth',
    '5 GB storage',
    'Priority support',
    'Custom domains',
    'Webhooks',
    'Analytics API'
  ]
};

const overageRates: BillingOverage[] = [
  { metric: 'API Calls', overage: 0, rate: 0.001, cost: 0 },
  { metric: 'QR Codes', overage: 0, rate: 0.05, cost: 0 },
  { metric: 'Bandwidth', overage: 0, rate: 0.10, cost: 0 }
];

export default function ApiUsageQuota({ onBack }: ApiUsageQuotaProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [alerts, setAlerts] = useState(usageAlerts);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    warning: 75,
    critical: 90,
    emailNotify: true,
    slackNotify: false,
    webhookNotify: true
  });

  // Calculate usage percentage
  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  // Get status color based on usage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400 bg-red-500/20';
    if (percentage >= 75) return 'text-amber-400 bg-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/20';
  };

  // Get progress bar color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Days remaining in billing period
  const daysRemaining = 4;

  // Calculate projected usage
  const getProjectedUsage = (current: number, limit: number) => {
    const daysPassed = 28;
    const dailyAvg = current / daysPassed;
    const projected = dailyAvg * 31;
    return Math.min(projected, limit * 1.5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to API Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Usage & Quota</h1>
              <p className="text-slate-400">Monitor your API usage and manage limits</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>

            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Billing Period Banner */}
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="font-medium">Current Billing Period: Jan 1 - Jan 31, 2024</div>
              <div className="text-sm text-slate-400">
                {daysRemaining} days remaining • Resets on {planDetails.nextBilling}
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors">
            View Billing
          </button>
        </div>

        {/* Active Alerts */}
        {alerts.filter(a => !a.acknowledged).length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  alert.type === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    alert.type === 'critical' ? 'text-red-400' :
                    alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                  }`} />
                  <div>
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Usage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {usageMetrics.map(metric => {
            const percentage = getUsagePercentage(metric.current, metric.limit);
            const projected = getProjectedUsage(metric.current, metric.limit);
            const projectedPercentage = (projected / metric.limit) * 100;

            return (
              <div
                key={metric.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                      <metric.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{metric.name}</div>
                      <div className={`text-xs flex items-center gap-1 ${
                        metric.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {metric.trend >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(metric.trend)}% vs last period
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(percentage)}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Usage numbers */}
                <div className="mb-3">
                  <div className="text-2xl font-bold">
                    {formatNumber(metric.current)}
                    <span className="text-sm font-normal text-slate-400 ml-1">
                      / {formatNumber(metric.limit)} {metric.unit}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute inset-y-0 left-0 ${getProgressColor(percentage)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                  {/* Projected marker */}
                  {projectedPercentage > percentage && projectedPercentage <= 100 && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white/50"
                      style={{ left: `${projectedPercentage}%` }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {formatNumber(metric.limit - metric.current)} {metric.unit} remaining
                  </span>
                  <span>Resets: {metric.resetDate}</span>
                </div>

                {/* Projected usage warning */}
                {projectedPercentage > 100 && (
                  <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-200">
                      Projected to exceed limit by {((projectedPercentage - 100) * metric.limit / 100).toFixed(0)} {metric.unit}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Usage Chart */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Usage Trend (Last 7 Days)
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  API Calls
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  QR Codes
                </span>
              </div>
            </div>

            {/* Simple bar chart representation */}
            <div className="flex items-end justify-between h-48 gap-2">
              {dailyUsage.map((day, i) => {
                const maxCalls = Math.max(...dailyUsage.map(d => d.apiCalls));
                const callsHeight = (day.apiCalls / maxCalls) * 100;
                const qrHeight = (day.qrCodes / 50) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center gap-1 h-40">
                      <div
                        className="w-3 bg-blue-500 rounded-t transition-all"
                        style={{ height: `${callsHeight}%` }}
                        title={`${day.apiCalls} API calls`}
                      />
                      <div
                        className="w-3 bg-emerald-500 rounded-t transition-all"
                        style={{ height: `${qrHeight}%` }}
                        title={`${day.qrCodes} QR codes`}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-400">Avg. Daily API Calls</div>
                <div className="text-xl font-bold">
                  {formatNumber(Math.round(dailyUsage.reduce((a, b) => a + b.apiCalls, 0) / dailyUsage.length))}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Avg. Daily QR Codes</div>
                <div className="text-xl font-bold">
                  {Math.round(dailyUsage.reduce((a, b) => a + b.qrCodes, 0) / dailyUsage.length)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Peak Usage Day</div>
                <div className="text-xl font-bold">Thursday</div>
              </div>
            </div>
          </div>

          {/* Plan & Billing */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Current Plan
            </h2>

            <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-lg p-4 mb-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">{planDetails.name}</span>
                <span className="px-2 py-0.5 text-xs bg-purple-500 rounded-full">Active</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                ${planDetails.price}
                <span className="text-sm font-normal text-slate-400">/{planDetails.billingCycle}</span>
              </div>
              <div className="text-xs text-slate-400">
                Next billing: {planDetails.nextBilling}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {planDetails.features.slice(0, 4).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
              <button className="text-sm text-blue-400 hover:underline flex items-center gap-1">
                View all features
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg font-medium transition-colors">
              Upgrade Plan
            </button>

            {/* Overage Info */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm font-medium mb-2">Overage Rates</div>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>API Calls</span>
                  <span>$0.001 / call</span>
                </div>
                <div className="flex justify-between">
                  <span>QR Codes</span>
                  <span>$0.05 / code</span>
                </div>
                <div className="flex justify-between">
                  <span>Bandwidth</span>
                  <span>$0.10 / GB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Usage Alerts
            </h2>
            <button
              onClick={() => setShowAlertSettings(!showAlertSettings)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>

          {showAlertSettings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">Alert Thresholds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Warning threshold</span>
                      <span className="text-sm font-medium text-amber-400">{alertThresholds.warning}%</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={alertThresholds.warning}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, warning: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Critical threshold</span>
                      <span className="text-sm font-medium text-red-400">{alertThresholds.critical}%</span>
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      value={alertThresholds.critical}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, critical: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4">Notification Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <span>Email Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.emailNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, emailNotify: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-slate-400" />
                      <span>Slack Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.slackNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, slackNotify: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-slate-400" />
                      <span>Webhook Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertThresholds.webhookNotify}
                      onChange={(e) => setAlertThresholds({ ...alertThresholds, webhookNotify: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-medium">Warning Alert</div>
                  <div className="text-sm text-slate-400">At {alertThresholds.warning}% usage</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="font-medium">Critical Alert</div>
                  <div className="text-sm text-slate-400">At {alertThresholds.critical}% usage</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">Active Channels</div>
                  <div className="text-sm text-slate-400">
                    {[
                      alertThresholds.emailNotify && 'Email',
                      alertThresholds.slackNotify && 'Slack',
                      alertThresholds.webhookNotify && 'Webhook'
                    ].filter(Boolean).join(', ') || 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alert History */}
        <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Alert History
          </h2>

          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  alert.acknowledged ? 'bg-slate-700/30' : 'bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'critical' ? 'bg-red-500' :
                    alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className={alert.acknowledged ? 'text-slate-400' : 'font-medium'}>
                      {alert.message}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  alert.acknowledged
                    ? 'bg-slate-600 text-slate-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {alert.acknowledged ? 'Acknowledged' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
