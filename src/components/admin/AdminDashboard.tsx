import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { User, ResourceItem, EmergencyIncident, Allocation, PlatformMetrics } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ShieldCheck,
  Users,
  Package,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Settings,
  Layers
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'providers' | 'resources' | 'emergencies' | 'allocations' | 'analytics' | 'audit'>('overview');

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, resRes, emgRes, alcRes] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getUsers(),
        api.getResources(),
        api.getEmergencies(),
        api.getAllocations(),
      ]);

      setAnalyticsData(analyticsRes);
      setUsers(usersRes.users);
      setResources(resRes.resources);
      setEmergencies(emgRes.emergencies);
      setAllocations(alcRes.allocations);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(targetUser.id, { status: nextStatus });
      showToast(`User ${targetUser.full_name} status updated to '${nextStatus}'`, 'info');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleChangeRole = async (targetUser: User, newRole: any) => {
    try {
      await api.updateUser(targetUser.id, { role: newRole });
      showToast(`User role updated to '${newRole}'`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to change role', 'error');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to administratively remove this listing?')) return;
    try {
      await api.deleteResource(id);
      showToast('Resource removed by administrator', 'info');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove resource', 'error');
    }
  };

  const metrics: PlatformMetrics | null = analyticsData?.metrics || null;

  // Colors for Recharts
  const COLORS = ['#102A43', '#0F766E', '#2563EB', '#E63946', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
            <span>GeoResQ Control</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">System Administration & Analytics</span>
          </div>
          <h2 className="text-2xl font-bold text-[#102A43]">
            Platform Governance Console
          </h2>
        </div>

        <button
          onClick={loadAdminData}
          className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'analytics' ? 'bg-[#102A43] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Live Analytics & Charts
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'resources' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Resources ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('emergencies')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'emergencies' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Emergency Incidents ({emergencies.length})
        </button>
        <button
          onClick={() => setActiveTab('allocations')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'allocations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Allocations Audit ({allocations.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Users</span>
              <p className="text-3xl font-extrabold text-[#102A43] font-mono tabular-nums mt-1">{metrics?.total_users || users.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">{metrics?.active_providers || 2} verified providers</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Catalogued Resources</span>
              <p className="text-3xl font-extrabold text-[#0F766E] font-mono tabular-nums mt-1">{metrics?.total_resources || resources.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">{metrics?.available_resources || 8} currently available</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Emergency Incidents</span>
              <p className="text-3xl font-extrabold text-[#E63946] font-mono tabular-nums mt-1">{metrics?.total_emergencies || emergencies.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">{metrics?.active_emergencies || 3} active / in progress</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Allocations</span>
              <p className="text-3xl font-extrabold text-[#2563EB] font-mono tabular-nums mt-1">{metrics?.total_allocations || allocations.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">100% transactional isolation</p>
            </div>
          </div>

          {/* Quick Recent Activity Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-[#102A43] text-sm">Recent Emergency Triage Queue</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {emergencies.slice(0, 4).map((em) => (
                  <div key={em.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{em.emergency_type} in {em.district}</p>
                      <p className="text-[11px] text-slate-500">{em.requester_name} · {em.people_affected} affected</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={em.priority} type="priority" />
                      <StatusBadge status={em.status} type="status" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-[#102A43] text-sm">Latest Resource Dispatch Logs</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {allocations.slice(0, 4).map((al) => (
                  <div key={al.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{al.allocated_quantity} {al.unit} · {al.resource_name}</p>
                      <p className="text-[11px] text-slate-500">To Emergency #{al.emergency_id} · By {al.coordinator_name}</p>
                    </div>
                    <StatusBadge status={al.status} type="status" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ANALYTICS & CHARTS (RECHARTS) */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-[#102A43] text-base mb-1">
              Resource Distribution by Relief Category
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Aggregated real-time inventory from verified suppliers across categories.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.category_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total_units" fill="#0F766E" radius={[6, 6, 0, 0]} name="Total Units Stocked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-[#102A43] text-base mb-1">
                Emergency Incidents by Priority
              </h3>
              <p className="text-xs text-slate-500 mb-6">Urgency breakdown of incoming citizen distress reports.</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.emergencies_by_priority || []}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }: any) => `${name || 'Item'}: ${value || 0}`}
                    >
                      {(analyticsData?.emergencies_by_priority || []).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.priority === 'critical'
                              ? '#E63946'
                              : entry.priority === 'high'
                              ? '#F59E0B'
                              : entry.priority === 'medium'
                              ? '#2563EB'
                              : '#0F766E'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-[#102A43] text-base mb-1">
                District-Wise Resource Stocking
              </h3>
              <p className="text-xs text-slate-500 mb-6">Disaster supplies by provincial geographic district.</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.district_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="resource_count" fill="#102A43" radius={[4, 4, 0, 0]} name="Active Resource Listings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#102A43] text-base">User Directory & Role Authorization</h3>
            <span className="text-xs text-slate-500">Only admins can assign coordinator permissions</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Contact</th>
                    <th className="py-3 px-4 font-semibold">District</th>
                    <th className="py-3 px-4 font-semibold">Assigned Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600">{u.district || 'Colombo'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                        >
                          <option value="citizen">Citizen</option>
                          <option value="provider">Provider</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.status} type="status" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded ${
                            u.status === 'active'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALL RESOURCES AUDIT */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <h3 className="font-bold text-[#102A43] text-base">Comprehensive Resource Catalog Audit</h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Resource</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Provider</th>
                    <th className="py-3 px-4 font-semibold">Quantity</th>
                    <th className="py-3 px-4 font-semibold">Pricing</th>
                    <th className="py-3 px-4 font-semibold">District</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3 px-4 text-slate-600">{r.category}</td>
                      <td className="py-3 px-4 text-slate-800">{r.provider_name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="py-3 px-4">{r.resource_type === 'free' ? 'Free Relief' : `LKR ${r.price}`}</td>
                      <td className="py-3 px-4 text-slate-600">{r.district}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteResource(r.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EMERGENCY INCIDENTS AUDIT */}
      {activeTab === 'emergencies' && (
        <div className="space-y-4">
          <h3 className="font-bold text-[#102A43] text-base">All Logged Emergency Reports</h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Requester</th>
                    <th className="py-3 px-4 font-semibold">District</th>
                    <th className="py-3 px-4 font-semibold">Affected</th>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emergencies.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-400">#{e.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{e.emergency_type}</td>
                      <td className="py-3 px-4 text-slate-700">{e.requester_name}</td>
                      <td className="py-3 px-4 text-slate-600">{e.district}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{e.people_affected}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={e.priority} type="priority" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={e.status} type="status" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ALLOCATIONS AUDIT */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <h3 className="font-bold text-[#102A43] text-base">Resource Allocation & Chain-of-Custody Records</h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Resource Allocated</th>
                    <th className="py-3 px-4 font-semibold">Emergency Incident</th>
                    <th className="py-3 px-4 font-semibold">Supplier Depot</th>
                    <th className="py-3 px-4 font-semibold">Authorized By</th>
                    <th className="py-3 px-4 font-semibold">Distance</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-400">#{a.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {a.allocated_quantity} {a.unit} · {a.resource_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E63946]">#{a.emergency_id}</td>
                      <td className="py-3 px-4 text-slate-700">{a.provider_name}</td>
                      <td className="py-3 px-4 text-slate-700">{a.coordinator_name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-blue-700">{a.distance_km} km</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={a.status} type="status" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="font-bold text-[#102A43] text-base">System Transaction & Security Audit Trail</h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Entity Type</th>
                    <th className="py-3 px-4 font-semibold">Entity ID</th>
                    <th className="py-3 px-4 font-semibold">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(analyticsData?.audit_logs || []).map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 font-mono">
                      <td className="py-3 px-4 text-slate-400">{log.created_at}</td>
                      <td className="py-3 px-4 font-bold text-[#102A43]">{log.action}</td>
                      <td className="py-3 px-4 text-slate-600">{log.entity_type}</td>
                      <td className="py-3 px-4 text-blue-600">#{log.entity_id}</td>
                      <td className="py-3 px-4 font-sans text-slate-700">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
