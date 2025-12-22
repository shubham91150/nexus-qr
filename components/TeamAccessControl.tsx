'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Mail,
  MoreVertical,
  Check,
  X,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Activity,
  AlertCircle,
  Lock,
  Unlock,
  Settings,
  UserCheck,
  UserX,
  Crown,
  Building,
  Globe,
  Zap,
  RefreshCw,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Info,
  Star,
  ExternalLink
} from 'lucide-react';

// Types
interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  apiKeys: number;
  lastActive: string;
  joinedAt: string;
  mfaEnabled: boolean;
  permissions: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: React.ElementType;
  memberCount: number;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'expired';
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: string;
  ipAddress: string;
}

// Mock data
const teamMembers: TeamMember[] = [
  {
    id: 'user-1',
    name: 'John Smith',
    email: 'john@company.com',
    role: 'owner',
    status: 'active',
    apiKeys: 3,
    lastActive: '2024-01-28T15:30:00Z',
    joinedAt: '2023-01-15T10:00:00Z',
    mfaEnabled: true,
    permissions: ['*']
  },
  {
    id: 'user-2',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'admin',
    status: 'active',
    apiKeys: 2,
    lastActive: '2024-01-28T14:45:00Z',
    joinedAt: '2023-03-20T09:00:00Z',
    mfaEnabled: true,
    permissions: ['qr:*', 'analytics:*', 'webhooks:*', 'team:read']
  },
  {
    id: 'user-3',
    name: 'Mike Chen',
    email: 'mike@company.com',
    role: 'developer',
    status: 'active',
    apiKeys: 1,
    lastActive: '2024-01-28T12:00:00Z',
    joinedAt: '2023-06-10T11:30:00Z',
    mfaEnabled: false,
    permissions: ['qr:create', 'qr:read', 'analytics:read']
  },
  {
    id: 'user-4',
    name: 'Emily Davis',
    email: 'emily@company.com',
    role: 'viewer',
    status: 'active',
    apiKeys: 0,
    lastActive: '2024-01-27T16:20:00Z',
    joinedAt: '2023-09-05T14:00:00Z',
    mfaEnabled: false,
    permissions: ['qr:read', 'analytics:read']
  },
  {
    id: 'user-5',
    name: 'Alex Turner',
    email: 'alex@company.com',
    role: 'developer',
    status: 'pending',
    apiKeys: 0,
    lastActive: '',
    joinedAt: '2024-01-25T10:00:00Z',
    mfaEnabled: false,
    permissions: ['qr:create', 'qr:read']
  },
  {
    id: 'user-6',
    name: 'Lisa Wong',
    email: 'lisa@company.com',
    role: 'developer',
    status: 'suspended',
    apiKeys: 1,
    lastActive: '2024-01-15T09:00:00Z',
    joinedAt: '2023-08-12T08:30:00Z',
    mfaEnabled: true,
    permissions: ['qr:*', 'analytics:read']
  }
];

const roles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all resources and settings',
    permissions: ['*'],
    color: 'from-amber-500 to-orange-600',
    icon: Crown,
    memberCount: 1
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Manage team, billing, and all API resources',
    permissions: ['qr:*', 'analytics:*', 'webhooks:*', 'team:*', 'billing:read'],
    color: 'from-purple-500 to-violet-600',
    icon: Shield,
    memberCount: 1
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Create and manage QR codes and webhooks',
    permissions: ['qr:*', 'analytics:read', 'webhooks:*'],
    color: 'from-blue-500 to-indigo-600',
    icon: Zap,
    memberCount: 3
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to QR codes and analytics',
    permissions: ['qr:read', 'analytics:read'],
    color: 'from-slate-500 to-slate-600',
    icon: Eye,
    memberCount: 1
  }
];

const invitations: Invitation[] = [
  {
    id: 'inv-1',
    email: 'newdev@company.com',
    role: 'developer',
    invitedBy: 'John Smith',
    sentAt: '2024-01-27T10:00:00Z',
    expiresAt: '2024-02-03T10:00:00Z',
    status: 'pending'
  },
  {
    id: 'inv-2',
    email: 'analyst@company.com',
    role: 'viewer',
    invitedBy: 'Sarah Johnson',
    sentAt: '2024-01-20T14:00:00Z',
    expiresAt: '2024-01-27T14:00:00Z',
    status: 'expired'
  }
];

const activityLogs: ActivityLog[] = [
  { id: 'log-1', userId: 'user-1', userName: 'John Smith', action: 'created', target: 'API Key "Production"', timestamp: '2024-01-28T15:30:00Z', ipAddress: '192.168.1.100' },
  { id: 'log-2', userId: 'user-2', userName: 'Sarah Johnson', action: 'invited', target: 'newdev@company.com', timestamp: '2024-01-28T14:45:00Z', ipAddress: '192.168.1.101' },
  { id: 'log-3', userId: 'user-3', userName: 'Mike Chen', action: 'generated', target: '150 QR codes via API', timestamp: '2024-01-28T12:00:00Z', ipAddress: '10.0.0.50' },
  { id: 'log-4', userId: 'user-1', userName: 'John Smith', action: 'suspended', target: 'Lisa Wong', timestamp: '2024-01-27T16:00:00Z', ipAddress: '192.168.1.100' },
  { id: 'log-5', userId: 'user-2', userName: 'Sarah Johnson', action: 'updated', target: 'Team settings', timestamp: '2024-01-27T11:30:00Z', ipAddress: '192.168.1.101' }
];

const permissionCategories = [
  {
    name: 'QR Codes',
    permissions: [
      { id: 'qr:create', label: 'Create QR codes' },
      { id: 'qr:read', label: 'View QR codes' },
      { id: 'qr:update', label: 'Update QR codes' },
      { id: 'qr:delete', label: 'Delete QR codes' }
    ]
  },
  {
    name: 'Analytics',
    permissions: [
      { id: 'analytics:read', label: 'View analytics' },
      { id: 'analytics:export', label: 'Export analytics' }
    ]
  },
  {
    name: 'Webhooks',
    permissions: [
      { id: 'webhooks:create', label: 'Create webhooks' },
      { id: 'webhooks:read', label: 'View webhooks' },
      { id: 'webhooks:update', label: 'Update webhooks' },
      { id: 'webhooks:delete', label: 'Delete webhooks' }
    ]
  },
  {
    name: 'Team',
    permissions: [
      { id: 'team:read', label: 'View team members' },
      { id: 'team:invite', label: 'Invite members' },
      { id: 'team:manage', label: 'Manage members' }
    ]
  },
  {
    name: 'Billing',
    permissions: [
      { id: 'billing:read', label: 'View billing' },
      { id: 'billing:manage', label: 'Manage billing' }
    ]
  }
];

export default function TeamAccessControl() {
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'invitations' | 'activity'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'developer',
    message: ''
  });

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Filter members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'developer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'viewer': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'pending': return 'bg-amber-500/20 text-amber-400';
      case 'suspended': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Get avatar initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Send invite
  const handleSendInvite = () => {
    console.log('Sending invite:', inviteForm);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'developer', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Team Management</h1>
              <p className="text-slate-400">Manage team members and access permissions</p>
            </div>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{teamMembers.length}</div>
                <div className="text-sm text-slate-400">Team Members</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === 'active').length}</div>
                <div className="text-sm text-slate-400">Active</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{invitations.filter(i => i.status === 'pending').length}</div>
                <div className="text-sm text-slate-400">Pending Invites</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{teamMembers.reduce((a, b) => a + b.apiKeys, 0)}</div>
                <div className="text-sm text-slate-400">API Keys</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700 mb-6">
          {[
            { id: 'members', label: 'Members', icon: Users, count: teamMembers.length },
            { id: 'roles', label: 'Roles', icon: Shield, count: roles.length },
            { id: 'invitations', label: 'Invitations', icon: Mail, count: invitations.filter(i => i.status === 'pending').length },
            { id: 'activity', label: 'Activity', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  activeTab === tab.id ? 'bg-purple-500/20' : 'bg-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Members List */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Member</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">API Keys</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Last Active</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Security</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-medium">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {member.name}
                              {member.role === 'owner' && (
                                <Crown className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <div className="text-sm text-slate-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(member.status)}`}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm">
                          <Key className="w-4 h-4 text-slate-400" />
                          {member.apiKeys}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatRelativeTime(member.lastActive)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {member.mfaEnabled ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <Shield className="w-3 h-3" />
                              MFA
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Shield className="w-3 h-3" />
                              No MFA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </button>
                          {member.role !== 'owner' && (
                            <>
                              {member.status === 'active' ? (
                                <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Suspend">
                                  <UserX className="w-4 h-4 text-slate-400" />
                                </button>
                              ) : member.status === 'suspended' ? (
                                <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Activate">
                                  <UserCheck className="w-4 h-4 text-slate-400" />
                                </button>
                              ) : null}
                              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-red-400" title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                      <role.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{role.name}</div>
                      <div className="text-sm text-slate-400">{role.memberCount} members</div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <p className="text-sm text-slate-400 mb-4">{role.description}</p>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 uppercase">Permissions</div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-slate-700 rounded">
                        {perm === '*' ? 'Full Access' : perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowRoleModal(true)}
              className="bg-slate-800/30 rounded-xl border border-dashed border-slate-600 p-6 hover:border-purple-500 hover:bg-slate-800/50 transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              <span className="font-medium">Create Custom Role</span>
              <span className="text-sm text-slate-400">Define specific permissions</span>
            </button>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Invited By</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Sent</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Expires</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(invite => (
                  <tr key={invite.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleColor(invite.role)}`}>
                        {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{invite.invitedBy}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(invite.sentAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(invite.expiresAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        invite.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {invite.status === 'pending' && (
                          <>
                            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Resend">
                              <RefreshCw className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(`https://app.nexusqr.com/invite/${invite.id}`, invite.id)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Copy Link"
                            >
                              {copied === invite.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </>
                        )}
                        <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-red-400" title="Revoke">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {invitations.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending invitations</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="space-y-4">
              {activityLogs.map(log => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-medium text-sm">
                    {getInitials(log.userName)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.userName}</span>
                      <span className="text-slate-400">{log.action}</span>
                      <span className="text-blue-400">{log.target}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(log.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {log.ipAddress}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Load More Activity
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Add a personal message..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvite}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-bold text-lg">
                  {getInitials(selectedMember.name)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.name}</h3>
                  <p className="text-slate-400">{selectedMember.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Role</div>
                <span className={`px-2 py-1 text-sm font-medium rounded border ${getRoleColor(selectedMember.role)}`}>
                  {selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                </span>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Status</div>
                <span className={`px-2 py-1 text-sm font-medium rounded ${getStatusColor(selectedMember.status)}`}>
                  {selectedMember.status.charAt(0).toUpperCase() + selectedMember.status.slice(1)}
                </span>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">API Keys</div>
                <div className="font-semibold">{selectedMember.apiKeys} active keys</div>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Joined</div>
                <div className="font-semibold">{formatDate(selectedMember.joinedAt)}</div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-3">Permissions</h4>
              <div className="space-y-3">
                {permissionCategories.map(category => (
                  <div key={category.name} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="font-medium mb-2">{category.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {category.permissions.map(perm => {
                        const hasPermission = selectedMember.permissions.includes('*') ||
                          selectedMember.permissions.includes(perm.id) ||
                          selectedMember.permissions.includes(`${category.name.toLowerCase()}:*`);
                        return (
                          <label key={perm.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => {}}
                              disabled={selectedMember.role === 'owner'}
                              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-purple-500"
                            />
                            <span className={hasPermission ? 'text-white' : 'text-slate-500'}>{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMember(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
