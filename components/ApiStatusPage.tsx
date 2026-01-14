import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle, XCircle, AlertTriangle, Clock,
  Server, Database, Globe, Zap, RefreshCw, ChevronDown,
  ChevronUp, ExternalLink, Bell, Calendar, TrendingUp,
  Shield, Wifi, HardDrive, Cpu, BarChart3
} from 'lucide-react';

type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';

interface Service {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  uptime: number;
  responseTime: number;
  lastChecked: string;
  icon: React.ElementType;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  affectedServices: string[];
  updates: {
    timestamp: string;
    message: string;
    status: string;
  }[];
}

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  affectedServices: string[];
}

// Mock Services
const SERVICES: Service[] = [
  {
    id: 'api',
    name: 'API',
    description: 'Core REST API endpoints',
    status: 'operational',
    uptime: 99.99,
    responseTime: 45,
    lastChecked: new Date().toISOString(),
    icon: Server
  },
  {
    id: 'qr-generation',
    name: 'QR Code Generation',
    description: 'QR code creation and styling',
    status: 'operational',
    uptime: 99.95,
    responseTime: 120,
    lastChecked: new Date().toISOString(),
    icon: Zap
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Scan tracking and reporting',
    status: 'operational',
    uptime: 99.90,
    responseTime: 85,
    lastChecked: new Date().toISOString(),
    icon: BarChart3
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Event delivery system',
    status: 'degraded',
    uptime: 98.50,
    responseTime: 250,
    lastChecked: new Date().toISOString(),
    icon: Wifi
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Primary data storage',
    status: 'operational',
    uptime: 99.99,
    responseTime: 12,
    lastChecked: new Date().toISOString(),
    icon: Database
  },
  {
    id: 'cdn',
    name: 'CDN',
    description: 'QR image delivery network',
    status: 'operational',
    uptime: 99.99,
    responseTime: 25,
    lastChecked: new Date().toISOString(),
    icon: Globe
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'API key validation',
    status: 'operational',
    uptime: 99.99,
    responseTime: 30,
    lastChecked: new Date().toISOString(),
    icon: Shield
  },
  {
    id: 'storage',
    name: 'Storage',
    description: 'File and image storage',
    status: 'operational',
    uptime: 99.95,
    responseTime: 55,
    lastChecked: new Date().toISOString(),
    icon: HardDrive
  }
];

// Mock Incidents
const INCIDENTS: Incident[] = [
  {
    id: 'inc_001',
    title: 'Elevated webhook delivery latency',
    status: 'monitoring',
    severity: 'minor',
    createdAt: '2024-12-21T10:30:00Z',
    updatedAt: '2024-12-21T12:45:00Z',
    resolvedAt: null,
    affectedServices: ['webhooks'],
    updates: [
      {
        timestamp: '2024-12-21T12:45:00Z',
        message: 'We have implemented a fix and are monitoring the results. Webhook delivery times are returning to normal.',
        status: 'monitoring'
      },
      {
        timestamp: '2024-12-21T11:15:00Z',
        message: 'We have identified the issue as increased load on our webhook queue processors. Scaling up resources now.',
        status: 'identified'
      },
      {
        timestamp: '2024-12-21T10:30:00Z',
        message: 'We are investigating reports of delayed webhook deliveries.',
        status: 'investigating'
      }
    ]
  }
];

// Mock Maintenance Windows
const MAINTENANCE_WINDOWS: MaintenanceWindow[] = [
  {
    id: 'maint_001',
    title: 'Database Performance Optimization',
    description: 'Scheduled maintenance to optimize database indexes and improve query performance.',
    scheduledStart: '2024-12-25T02:00:00Z',
    scheduledEnd: '2024-12-25T04:00:00Z',
    status: 'scheduled',
    affectedServices: ['database', 'api']
  }
];

// Uptime history for last 90 days
const generateUptimeHistory = () => {
  const history = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const random = Math.random();
    let status: ServiceStatus = 'operational';
    if (random < 0.02) status = 'major_outage';
    else if (random < 0.05) status = 'partial_outage';
    else if (random < 0.10) status = 'degraded';

    history.push({
      date: date.toISOString().split('T')[0],
      status
    });
  }
  return history;
};

interface ApiStatusPageProps {
  onBack?: () => void;
}

const ApiStatusPage: React.FC<ApiStatusPageProps> = ({ onBack }) => {
  const [services] = useState<Service[]>(SERVICES);
  const [incidents] = useState<Incident[]>(INCIDENTS);
  const [maintenance] = useState<MaintenanceWindow[]>(MAINTENANCE_WINDOWS);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [uptimeHistory] = useState(generateUptimeHistory());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getOverallStatus = (): ServiceStatus => {
    const hasOutage = services.some(s => s.status === 'major_outage');
    const hasPartialOutage = services.some(s => s.status === 'partial_outage');
    const hasDegraded = services.some(s => s.status === 'degraded');
    const hasMaintenance = services.some(s => s.status === 'maintenance');

    if (hasOutage) return 'major_outage';
    if (hasPartialOutage) return 'partial_outage';
    if (hasDegraded) return 'degraded';
    if (hasMaintenance) return 'maintenance';
    return 'operational';
  };

  const getStatusConfig = (status: ServiceStatus) => {
    const configs = {
      operational: {
        label: 'Operational',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        dotColor: 'bg-green-500'
      },
      degraded: {
        label: 'Degraded Performance',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-200',
        icon: AlertTriangle,
        dotColor: 'bg-amber-500'
      },
      partial_outage: {
        label: 'Partial Outage',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200',
        icon: AlertTriangle,
        dotColor: 'bg-orange-500'
      },
      major_outage: {
        label: 'Major Outage',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        icon: XCircle,
        dotColor: 'bg-red-500'
      },
      maintenance: {
        label: 'Under Maintenance',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        icon: Clock,
        dotColor: 'bg-blue-500'
      }
    };
    return configs[status];
  };

  const getSeverityConfig = (severity: Incident['severity']) => {
    const configs = {
      minor: { label: 'Minor', color: 'text-amber-600', bgColor: 'bg-amber-100' },
      major: { label: 'Major', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return configs[severity];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const overallStatus = getOverallStatus();
  const overallConfig = getStatusConfig(overallStatus);
  const OverallIcon = overallConfig.icon;

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              >
                <ChevronDown className="w-5 h-5 text-gray-600 rotate-90" />
              </button>
            )}
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">System Status</h1>
              <p className="text-xs text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-full text-xs text-gray-600 shadow-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3 h-3 rounded-full border-gray-300 text-green-600"
              />
              Auto
            </label>
            <button
              onClick={() => setLastUpdated(new Date())}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#E5FF00] rounded-full text-xs font-medium hover:bg-[#d4ee00] transition-colors">
              <div className="w-6 h-6 bg-gray-900/10 rounded-full flex items-center justify-center">
                <Bell className="w-3 h-3" />
              </div>
              Subscribe
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`rounded-[20px] p-5 mb-4 shadow-sm ${overallStatus === 'operational' ? 'bg-[#E5FF00]' : overallConfig.bgColor}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${overallStatus === 'operational' ? 'bg-gray-900/10' : overallConfig.bgColor}`}>
              <OverallIcon className={`w-7 h-7 ${overallStatus === 'operational' ? 'text-gray-900' : overallConfig.color}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${overallStatus === 'operational' ? 'text-gray-900' : overallConfig.color}`}>
                {overallStatus === 'operational'
                  ? 'All Systems Operational'
                  : overallConfig.label}
              </h2>
              <p className={`text-xs ${overallStatus === 'operational' ? 'text-gray-700' : 'text-gray-600'}`}>
                {overallStatus === 'operational'
                  ? 'All services are running normally'
                  : `${services.filter(s => s.status !== 'operational').length} service(s) affected`}
              </p>
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        {incidents.filter(i => i.status !== 'resolved').length > 0 && (
          <div className="bg-white rounded-[20px] shadow-sm mb-4 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Active Incidents</h3>
                  <p className="text-xs text-gray-500">Current issues being addressed</p>
                </div>
              </div>
            </div>

            {incidents.filter(i => i.status !== 'resolved').map((incident) => {
              const severityConfig = getSeverityConfig(incident.severity);
              const isExpanded = expandedIncident === incident.id;

              return (
                <div key={incident.id} className="border-b border-gray-100 last:border-0">
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}>
                            {severityConfig.label}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                            {incident.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Affected: {incident.affectedServices.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{formatDate(incident.updatedAt)}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50">
                      <div className="border-l-2 border-gray-200 ml-2 pl-4 space-y-4">
                        {incident.updates.map((update, idx) => (
                          <div key={idx}>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900 capitalize">
                                {update.status}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{formatDate(update.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scheduled Maintenance */}
        {maintenance.filter(m => m.status !== 'completed').length > 0 && (
          <div className="bg-[#A8C5DA] rounded-[20px] p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-800" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Scheduled Maintenance</h3>
                <p className="text-xs text-gray-700">Upcoming service windows</p>
              </div>
            </div>
            {maintenance.filter(m => m.status !== 'completed').map((maint) => (
              <div key={maint.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{maint.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{maint.description}</p>
                    <p className="text-sm text-blue-600 mt-2">
                      {formatDate(maint.scheduledStart)} - {formatDate(maint.scheduledEnd)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    maint.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    maint.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {maint.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Services Grid */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Services</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {services.map((service) => {
              const statusConfig = getStatusConfig(service.status);
              const ServiceIcon = service.icon;

              return (
                <div key={service.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ServiceIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{service.name}</h4>
                      <p className="text-xs text-gray-500">{service.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-medium text-gray-900">{service.uptime}%</p>
                      <p className="text-[10px] text-gray-500">{service.responseTime}ms</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
                      <span className={`text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 90-Day Uptime */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">90-Day Uptime</h3>
                <p className="text-xs text-gray-500">Historical performance</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">99.95%</span>
          </div>

          <div className="flex gap-0.5">
            {uptimeHistory.map((day, idx) => {
              const config = getStatusConfig(day.status);
              return (
                <div
                  key={idx}
                  className={`h-8 flex-1 rounded-sm ${config.dotColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                  title={`${day.date}: ${config.label}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>90 days ago</span>
            <span>Today</span>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs">
            {['operational', 'degraded', 'partial_outage', 'major_outage'].map((status) => {
              const config = getStatusConfig(status as ServiceStatus);
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${config.dotColor}`} />
                  <span className="text-gray-600">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 rounded-[20px] p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400">
            For real-time updates, subscribe to our status notifications or follow{' '}
            <a href="#" className="text-[#E5FF00] hover:underline">@NexusQRStatus</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiStatusPage;
