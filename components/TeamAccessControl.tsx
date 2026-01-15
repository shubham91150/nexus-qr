'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Mail,
  Check,
  X,
  Search,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Clock,
  Activity,
  UserCheck,
  UserX,
  Crown,
  Globe,
  Zap,
  RefreshCw,
  Send,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  TeamMember as ApiTeamMember
} from '../services/apiExtendedService';

interface TeamAccessControlProps {
  onBack: () => void;
  userId?: string;
}

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
  bgColor: string;
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

const roles: Role[] = [
  { id: 'owner', name: 'Owner', description: 'Full access to all resources', permissions: ['*'], color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Crown, memberCount: 1 },
  { id: 'admin', name: 'Admin', description: 'Manage team and resources', permissions: ['qr:*', 'analytics:*', 'webhooks:*', 'team:*'], color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Shield, memberCount: 1 },
  { id: 'developer', name: 'Developer', description: 'Create and manage QR codes', permissions: ['qr:*', 'analytics:read', 'webhooks:*'], color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Zap, memberCount: 3 },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', permissions: ['qr:read', 'analytics:read'], color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Eye, memberCount: 1 }
];

const invitations: Invitation[] = [
  { id: 'inv-1', email: 'newdev@company.com', role: 'developer', invitedBy: 'John Smith', sentAt: '2024-01-27T10:00:00Z', expiresAt: '2024-02-03T10:00:00Z', status: 'pending' },
  { id: 'inv-2', email: 'analyst@company.com', role: 'viewer', invitedBy: 'Sarah Johnson', sentAt: '2024-01-20T14:00:00Z', expiresAt: '2024-01-27T14:00:00Z', status: 'expired' }
];

const activityLogs: ActivityLog[] = [
  { id: 'log-1', userId: 'user-1', userName: 'John Smith', action: 'created', target: 'API Key "Production"', timestamp: '2024-01-28T15:30:00Z', ipAddress: '192.168.1.100' },
  { id: 'log-2', userId: 'user-2', userName: 'Sarah Johnson', action: 'invited', target: 'newdev@company.com', timestamp: '2024-01-28T14:45:00Z', ipAddress: '192.168.1.101' },
  { id: 'log-3', userId: 'user-3', userName: 'Mike Chen', action: 'generated', target: '150 QR codes via API', timestamp: '2024-01-28T12:00:00Z', ipAddress: '10.0.0.50' }
];

const permissionCategories = [
  { name: 'QR Codes', permissions: [{ id: 'qr:create', label: 'Create' }, { id: 'qr:read', label: 'View' }, { id: 'qr:update', label: 'Update' }, { id: 'qr:delete', label: 'Delete' }] },
  { name: 'Analytics', permissions: [{ id: 'analytics:read', label: 'View' }, { id: 'analytics:export', label: 'Export' }] },
  { name: 'Webhooks', permissions: [{ id: 'webhooks:create', label: 'Create' }, { id: 'webhooks:read', label: 'View' }, { id: 'webhooks:update', label: 'Update' }, { id: 'webhooks:delete', label: 'Delete' }] },
  { name: 'Team', permissions: [{ id: 'team:read', label: 'View' }, { id: 'team:invite', label: 'Invite' }, { id: 'team:manage', label: 'Manage' }] }
];

export default function TeamAccessControl({ onBack, userId }: TeamAccessControlProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'invitations'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'developer', message: '' });

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getTeamMembers(userId);
      const transformedMembers: TeamMember[] = data.map(m => ({
        id: m.id, name: m.name || 'Unknown', email: m.email, role: m.role, status: m.status,
        apiKeys: m.api_keys_count, lastActive: m.last_active_at || '', joinedAt: m.joined_at,
        mfaEnabled: m.mfa_enabled, permissions: Array.isArray(m.permissions) ? m.permissions : []
      }));
      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'owner': return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-700' };
      case 'developer': return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'viewer': return { bg: 'bg-gray-100', text: 'text-gray-700' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleSendInvite = async () => {
    if (!userId || !inviteForm.email) return;
    try {
      await inviteTeamMember(userId, inviteForm.email, inviteForm.role as 'admin' | 'developer' | 'viewer', userId);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'developer', message: '' });
      fetchData();
    } catch (error) {
      console.error('Error sending invite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-xs text-gray-500">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-800 truncate">Team Management</h1>
              <p className="text-xs text-gray-500 truncate">Manage members & permissions</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors flex-shrink-0 w-full sm:w-auto"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-3 h-3" />
            </div>
            Invite
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4">
          <div className="bg-white rounded-[20px] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{members.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">Team Members</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{members.filter(m => m.status === 'active').length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">Active</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{invitations.filter(i => i.status === 'pending').length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">Pending</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Key className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{members.reduce((a, b) => a + b.apiKeys, 0)}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">API Keys</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-[20px] p-2 mb-4 shadow-sm flex gap-1 sm:gap-2 overflow-x-auto">
          {[
            { id: 'members', label: 'Members', icon: Users, count: members.length },
            { id: 'roles', label: 'Roles', icon: Shield, count: roles.length },
            { id: 'invitations', label: 'Invites', icon: Mail, count: invitations.filter(i => i.status === 'pending').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 rounded-[16px] text-xs font-medium transition-colors min-w-0 ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                <tab.icon className="w-3 h-3" />
              </div>
              <span className="hidden sm:inline truncate">{tab.label}</span>
              <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] rounded-full flex-shrink-0 ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-[20px] p-4 mb-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-14 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex gap-2 sm:gap-4">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 rounded-full text-xs focus:ring-2 focus:ring-purple-500 min-w-0"
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
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 rounded-full text-xs focus:ring-2 focus:ring-purple-500 min-w-0"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-[20px] overflow-hidden shadow-sm">
              <div className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Team Members</div>
                  <div className="text-xs text-gray-500">{filteredMembers.length} members</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Member</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(member => {
                      const roleStyle = getRoleStyle(member.role);
                      return (
                        <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-semibold">
                                {getInitials(member.name)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                  {member.name}
                                  {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                                </div>
                                <div className="text-xs text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusStyle(member.status)}`}>
                              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedMember(member)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500" />
                              </button>
                              {member.role !== 'owner' && (
                                <button className="p-2 hover:bg-red-50 rounded-full transition-colors">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredMembers.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No Members Found</h3>
                  <p className="text-xs text-gray-500">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="bg-white rounded-[20px] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role.bgColor}`}>
                      <role.icon className={`w-6 h-6 ${role.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{role.name}</div>
                      <div className="text-xs text-gray-500">{role.memberCount} members</div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-4">{role.description}</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((perm, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {perm === '*' ? 'Full Access' : perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <button className="bg-white rounded-[20px] p-5 shadow-sm flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-colors min-h-[180px]">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Create Custom Role</span>
              <span className="text-xs text-gray-500">Define specific permissions</span>
            </button>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="bg-white rounded-[20px] overflow-hidden shadow-sm">
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Pending Invitations</div>
                <div className="text-xs text-gray-500">{invitations.filter(i => i.status === 'pending').length} pending</div>
              </div>
            </div>

            {invitations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No Invitations</h3>
                <p className="text-xs text-gray-500">All invitations have been accepted</p>
              </div>
            ) : (
              <div>
                {invitations.map(invite => {
                  const roleStyle = getRoleStyle(invite.role);
                  return (
                    <div key={invite.id} className="p-4 border-t border-gray-100 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{invite.email}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                                {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                              </span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                invite.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                          {invite.status === 'pending' && (
                            <button
                              onClick={() => copyToClipboard(`https://app.nexusqr.com/invite/${invite.id}`, invite.id)}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                {copied === invite.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
                              </div>
                              Copy
                            </button>
                          )}
                          <button className="p-2 hover:bg-red-50 rounded-full transition-colors">
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Invite Team Member</h3>
                <p className="text-xs text-gray-500">Send an invitation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 bg-gray-100 rounded-[12px] text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['admin', 'developer', 'viewer'].map(role => {
                    const roleData = roles.find(r => r.id === role)!;
                    return (
                      <button
                        key={role}
                        onClick={() => setInviteForm({ ...inviteForm, role })}
                        className={`flex items-center gap-2 px-3 py-3 rounded-[12px] transition-all ${
                          inviteForm.role === role
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          inviteForm.role === role ? 'bg-white/20' : roleData.bgColor
                        }`}>
                          <roleData.icon className={`w-3 h-3 ${inviteForm.role === role ? 'text-white' : roleData.color}`} />
                        </div>
                        <span className="text-xs font-medium">{roleData.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Add a personal message..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-100 rounded-[12px] text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                  {getInitials(selectedMember.name)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{selectedMember.name}</h3>
                  <p className="text-xs text-gray-500">{selectedMember.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-[12px] p-4">
                <div className="text-xs text-gray-500 mb-1">Role</div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRoleStyle(selectedMember.role).bg} ${getRoleStyle(selectedMember.role).text}`}>
                  {selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-4">
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusStyle(selectedMember.status)}`}>
                  {selectedMember.status.charAt(0).toUpperCase() + selectedMember.status.slice(1)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-4">
                <div className="text-xs text-gray-500 mb-1">API Keys</div>
                <div className="text-sm font-semibold text-gray-900">{selectedMember.apiKeys} active</div>
              </div>
              <div className="bg-gray-50 rounded-[12px] p-4">
                <div className="text-xs text-gray-500 mb-1">Last Active</div>
                <div className="text-sm font-semibold text-gray-900">{formatRelativeTime(selectedMember.lastActive)}</div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Permissions</h4>
              <div className="space-y-3">
                {permissionCategories.map(category => (
                  <div key={category.name} className="bg-gray-50 rounded-[12px] p-4">
                    <div className="text-xs font-medium text-gray-900 mb-2">{category.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {category.permissions.map(perm => {
                        const hasPermission = selectedMember.permissions.includes('*') || selectedMember.permissions.includes(perm.id);
                        return (
                          <label key={perm.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              readOnly
                              disabled={selectedMember.role === 'owner'}
                              className="w-4 h-4 rounded text-purple-500"
                            />
                            <span className={hasPermission ? 'text-gray-900' : 'text-gray-400'}>{perm.label}</span>
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
                className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
