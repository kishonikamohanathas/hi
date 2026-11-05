import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  EmergencyIncident,
  ResourceItem,
  Allocation,
  ShelterItem,
  VolunteerItem,
} from '../../types';
import { MapComponent } from '../common/MapComponent';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertTriangle,
  Layers,
  MapPin,
  CheckCircle2,
  Users,
  Home,
  FileText,
  Activity,
  Send,
  Navigation,
  Sparkles,
  RefreshCw,
  X,
  Plus
} from 'lucide-react';

export const CoordinatorDashboard: React.FC = () => {
  const { user, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'incidents' | 'allocate' | 'volunteers' | 'shelters'>('overview');

  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [shelters, setShelters] = useState<ShelterItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-Match Allocation Engine State
  const [selectedIncidentForMatch, setSelectedIncidentForMatch] = useState<EmergencyIncident | null>(null);
  const [matchRecommendations, setMatchRecommendations] = useState<Array<ResourceItem & { match_score: number; recommendation_reason: string }>>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [allocatingResource, setAllocatingResource] = useState<ResourceItem | null>(null);
  const [allocQty, setAllocQty] = useState(10);
  const [allocNotes, setAllocNotes] = useState('');

  // Triage Modal
  const [triageIncident, setTriageIncident] = useState<EmergencyIncident | null>(null);
  const [newStatus, setNewStatus] = useState('verified');
  const [newPriority, setNewPriority] = useState('critical');
  const [triageNotes, setTriageNotes] = useState('');

  // Add Shelter Modal
  const [showAddShelter, setShowAddShelter] = useState(false);
  const [shelterName, setShelterName] = useState('');
  const [shelterDistrict, setShelterDistrict] = useState('Colombo');
  const [shelterCapacity, setShelterCapacity] = useState(300);
  const [shelterContact, setShelterContact] = useState('');
  const [shelterPhone, setShelterPhone] = useState('');
  const [shelterCoords, setShelterCoords] = useState<{ lat: number; lng: number }>({ lat: 6.9458, lng: 79.8698 });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [emgRes, resRes, alcRes, shlRes, volRes] = await Promise.all([
        api.getEmergencies(),
        api.getResources(),
        api.getAllocations(),
        api.getShelters(),
        api.getVolunteers(),
      ]);
      setEmergencies(emgRes.emergencies);
      setResources(resRes.resources);
      setAllocations(alcRes.allocations);
      setShelters(shlRes.shelters);
      setVolunteers(volRes.volunteers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Run Intelligent Auto-Match Recommendation Engine
  const runAutoMatchEngine = async (incident: EmergencyIncident) => {
    setSelectedIncidentForMatch(incident);
    setIsMatching(true);
    try {
      const res = await api.getRecommendations(incident.id);
      setMatchRecommendations(res.recommendations);
      setActiveTab('allocate');
      showToast(`Computed ${res.recommendations.length} intelligent matching resources ranked by proximity & stock`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Auto-match failed', 'error');
    } finally {
      setIsMatching(false);
    }
  };

  // Submit Transactional Allocation
  const handleConfirmAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForMatch || !allocatingResource) return;

    try {
      await api.createAllocation({
        emergency_id: selectedIncidentForMatch.id,
        resource_id: allocatingResource.id,
        allocated_quantity: allocQty,
        notes: allocNotes,
      });

      showToast(`Successfully allocated ${allocQty} ${allocatingResource.unit} to Emergency #${selectedIncidentForMatch.id}`, 'success');
      setAllocatingResource(null);
      loadAllData();
      if (selectedIncidentForMatch) {
        runAutoMatchEngine(selectedIncidentForMatch);
      }
    } catch (err: any) {
      showToast(err.message || 'Allocation rejected', 'error');
    }
  };

  // Update Triage Status
  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageIncident) return;

    try {
      await api.updateEmergencyStatus(triageIncident.id, {
        status: newStatus,
        priority: newPriority,
        triage_notes: triageNotes,
      });

      showToast(`Incident #${triageIncident.id} updated to status '${newStatus}'`, 'success');
      setTriageIncident(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update incident', 'error');
    }
  };

  // Add Shelter
  const handleAddShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addShelter({
        name: shelterName,
        district: shelterDistrict,
        capacity: shelterCapacity,
        occupancy: 0,
        contact_person: shelterContact,
        contact_phone: shelterPhone,
        latitude: shelterCoords.lat,
        longitude: shelterCoords.lng,
        status: 'open',
      });
      showToast('Emergency shelter registered successfully', 'success');
      setShowAddShelter(false);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add shelter', 'error');
    }
  };

  // Volunteer Deployment
  const handleAssignVolunteer = async (volId: string, emergencyId: string | null) => {
    try {
      await api.assignVolunteer(volId, {
        emergency_id: emergencyId,
        availability_status: emergencyId ? 'deployed' : 'available',
      });
      showToast('Volunteer deployment status updated', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update volunteer', 'error');
    }
  };

  // Metrics
  const criticalCount = emergencies.filter((e) => e.priority === 'critical' && e.status !== 'resolved' && e.status !== 'closed').length;
  const activeEmergencies = emergencies.filter((e) => e.status !== 'resolved' && e.status !== 'closed').length;
  const totalShelterCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const totalShelterOccupancy = shelters.reduce((acc, s) => acc + s.occupancy, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
            <span>GeoResQ Tactical Command</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">Emergency Operations Coordinator</span>
          </div>
          <h2 className="text-2xl font-bold text-[#102A43]">
            Tactical Emergency Command Center
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData()}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Telemetry</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Operations Overview
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Live Tactical Map
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'incidents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Incidents Triage ({activeEmergencies})
        </button>
        <button
          onClick={() => setActiveTab('allocate')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'allocate' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-[#0F766E]'
          }`}
        >
          Intelligent Allocation Engine
        </button>
        <button
          onClick={() => setActiveTab('volunteers')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'volunteers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Volunteers ({volunteers.length})
        </button>
        <button
          onClick={() => setActiveTab('shelters')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'shelters' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Shelter Network ({shelters.length})
        </button>
      </div>

      {/* TAB 1: OPERATIONS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-xs">
              <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Critical Incidents</span>
              <p className="text-3xl font-extrabold text-[#E63946] font-mono tabular-nums mt-1">{criticalCount}</p>
              <p className="text-[11px] text-slate-400 mt-1">Requires immediate response</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active Incidents</span>
              <p className="text-3xl font-extrabold text-[#102A43] font-mono tabular-nums mt-1">{activeEmergencies}</p>
              <p className="text-[11px] text-slate-400 mt-1">Across all districts</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatched Allocations</span>
              <p className="text-3xl font-extrabold text-[#0F766E] font-mono tabular-nums mt-1">{allocations.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">Relief supplies reserved</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shelter Occupancy</span>
              <p className="text-3xl font-extrabold text-[#2563EB] font-mono tabular-nums mt-1">
                {totalShelterOccupancy} / {totalShelterCapacity}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {Math.round((totalShelterOccupancy / (totalShelterCapacity || 1)) * 100)}% network capacity
              </p>
            </div>
          </div>

          {/* Active Incidents Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#102A43] text-base">Active Incident Response Queue</h3>
                <p className="text-xs text-slate-500">Click "Auto-Match" to trigger intelligent geospatial supplier matching</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Incident</th>
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold">District</th>
                    <th className="py-2.5 px-4 font-semibold">Affected</th>
                    <th className="py-2.5 px-4 font-semibold">Priority</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emergencies.map((emg) => (
                    <tr key={emg.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-400 block text-[10px]">#{emg.id}</span>
                        <span className="font-bold text-slate-900">{emg.requester_name}</span>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{emg.description}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{emg.emergency_type}</td>
                      <td className="py-3 px-4 text-slate-600">{emg.district}</td>
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {emg.people_affected}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={emg.priority} type="priority" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={emg.status} type="status" />
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setTriageIncident(emg);
                            setNewStatus(emg.status);
                            setNewPriority(emg.priority);
                            setTriageNotes(emg.triage_notes || '');
                          }}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-xs"
                        >
                          Triage
                        </button>
                        <button
                          onClick={() => runAutoMatchEngine(emg)}
                          className="px-3 py-1 bg-[#0F766E] hover:bg-[#0D655E] text-white rounded-md font-semibold text-xs shadow-xs"
                        >
                          Auto-Match
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

      {/* TAB 2: LIVE TACTICAL MAP */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[#102A43]">Live Incident & Asset Tactical Situation Map</h3>
              <p className="text-xs text-slate-500">
                Plotting live reported incidents, regional supply depots, and community shelters.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E63946]" />
                Emergency Incident
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
                Verified Supply Depot
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
                Emergency Shelter
              </span>
            </div>
          </div>

          <MapComponent
            height="650px"
            emergencies={emergencies}
            resources={resources}
            shelters={shelters}
            onSelectEmergency={(e) => runAutoMatchEngine(e)}
          />
        </div>
      )}

      {/* TAB 3: INCIDENTS TRIAGE */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <h3 className="font-bold text-[#102A43] text-base">Full Incident Triage & Verification Logs</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {emergencies.map((emg) => (
              <div
                key={emg.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <span className="font-mono text-xs font-bold text-slate-400">#{emg.id}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={emg.priority} type="priority" />
                      <span className="text-slate-300">·</span>
                      <StatusBadge status={emg.status} type="status" />
                    </div>
                  </div>

                  <h4 className="font-bold text-[#102A43] text-base mb-1">
                    {emg.emergency_type} in {emg.district}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">Requester: {emg.requester_name} (📞 {emg.contact_phone})</p>
                  <p className="text-xs text-slate-700 leading-relaxed mb-3">{emg.description}</p>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600 mb-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address / Route:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[200px]">{emg.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Affected Count:</span>
                      <span className="font-mono font-bold text-slate-900">{emg.people_affected} people</span>
                    </div>
                    {emg.required_resources && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Supplies Needed:</span>
                        <span className="font-semibold text-[#0F766E] truncate max-w-[200px]">{emg.required_resources}</span>
                      </div>
                    )}
                  </div>

                  {emg.triage_notes && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900">
                      <strong>Triage Action:</strong> {emg.triage_notes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setTriageIncident(emg);
                      setNewStatus(emg.status);
                      setNewPriority(emg.priority);
                      setTriageNotes(emg.triage_notes || '');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Edit Status & Notes
                  </button>
                  <button
                    onClick={() => runAutoMatchEngine(emg)}
                    className="px-3.5 py-1.5 bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Auto-Match</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INTELLIGENT ALLOCATION ENGINE */}
      {activeTab === 'allocate' && (
        <div className="space-y-6">
          <div className="bg-[#102A43] text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Intelligent Geospatial Allocation Engine</span>
                </div>
                <h3 className="text-xl font-bold">
                  {selectedIncidentForMatch
                    ? `Matching Candidates for Emergency #${selectedIncidentForMatch.id} (${selectedIncidentForMatch.emergency_type})`
                    : 'Select an Emergency Incident to Calculate Matches'}
                </h3>
                <p className="text-xs text-slate-300">
                  Factors in Haversine distance, urgency weight, category alignment, and real-time inventory to prevent over-allocation.
                </p>
              </div>

              {/* Selector to pick any emergency */}
              <div className="w-full sm:w-72">
                <select
                  value={selectedIncidentForMatch?.id || ''}
                  onChange={(e) => {
                    const found = emergencies.find((em) => em.id === e.target.value);
                    if (found) runAutoMatchEngine(found);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none"
                >
                  <option value="">-- Choose Emergency Incident --</option>
                  {emergencies.map((em) => (
                    <option key={em.id} value={em.id}>
                      #{em.id} · {em.emergency_type} ({em.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedIncidentForMatch && (
              <div className="p-3 bg-slate-800/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-4 border border-slate-700">
                <span>📍 Target Coordinates: {selectedIncidentForMatch.latitude.toFixed(4)}, {selectedIncidentForMatch.longitude.toFixed(4)} ({selectedIncidentForMatch.district})</span>
                <span>Urgency Priority: <strong className="text-red-400 uppercase">{selectedIncidentForMatch.priority}</strong></span>
                <span>People Affected: <strong>{selectedIncidentForMatch.people_affected}</strong></span>
              </div>
            )}
          </div>

          {/* Scored Recommendations List */}
          {matchRecommendations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No incident currently evaluated</p>
              <p className="text-xs text-slate-500 mt-1">Select an incident above to run proximity and inventory scoring.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Ranked Supplier Matches ({matchRecommendations.length} verified options)
              </h4>

              <div className="space-y-3">
                {matchRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2 text-xs">
                        {/* Match Score Badge */}
                        <span className="font-mono font-bold text-sm text-[#0F766E] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">
                          {rec.match_score}/100 Match Score
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono tabular-nums font-semibold text-[#2563EB]">
                          {rec.distance_km} km away
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{rec.district}</span>
                      </div>

                      <h5 className="font-bold text-[#102A43] text-base">{rec.name}</h5>
                      <p className="text-xs text-slate-600">{rec.recommendation_reason}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <span>Provider: <strong className="text-slate-800">{rec.provider_name}</strong></span>
                        <span>Stock: <strong className="font-mono text-slate-900">{rec.quantity} {rec.unit}</strong></span>
                        <span>Type: {rec.resource_type === 'free' ? 'Free Relief' : `LKR ${rec.price}`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={
                          rec.directions_url ||
                          `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${selectedIncidentForMatch?.latitude}%2C${selectedIncidentForMatch?.longitude}%3B${rec.latitude}%2C${rec.longitude}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Route</span>
                      </a>

                      <button
                        onClick={() => {
                          setAllocatingResource(rec);
                          setAllocQty(Math.min(rec.quantity, 50));
                          setAllocNotes(`Dispatched for Emergency #${selectedIncidentForMatch?.id}`);
                        }}
                        className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Allocate Resources</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: VOLUNTEER COORDINATION */}
      {activeTab === 'volunteers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#102A43] text-base">Community Volunteer Task Force Directory</h3>
            <span className="text-xs text-slate-500">Assign trained volunteers to emergency incidents</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Volunteer Name</th>
                    <th className="py-3 px-4 font-semibold">Certified Skills</th>
                    <th className="py-3 px-4 font-semibold">District</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Assignment</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {volunteers.map((vol) => (
                    <tr key={vol.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{vol.name}</p>
                        <p className="text-[11px] text-slate-400">📞 {vol.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">{vol.skills}</td>
                      <td className="py-3 px-4 text-slate-600">{vol.district}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={vol.availability_status} type="status" />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {vol.assigned_emergency_id ? `Emergency #${vol.assigned_emergency_id}` : 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {vol.assigned_emergency_id ? (
                          <button
                            onClick={() => handleAssignVolunteer(vol.id, null)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                          >
                            Stand Down
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const emgId = emergencies[0]?.id;
                              if (emgId) handleAssignVolunteer(vol.id, emgId);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs shadow-xs"
                          >
                            Deploy to Incident
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SHELTER NETWORK */}
      {activeTab === 'shelters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#102A43] text-base">Community Emergency Shelters</h3>
              <p className="text-xs text-slate-500">Monitor bed capacity, occupancies, and medical facilities</p>
            </div>
            <button
              onClick={() => setShowAddShelter(true)}
              className="px-3 py-1.5 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Emergency Shelter</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shelters.map((s) => {
              const occupancyPct = Math.round((s.occupancy / s.capacity) * 100);
              return (
                <div
                  key={s.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-semibold text-[#6366F1] uppercase">{s.district}</span>
                    <StatusBadge status={s.status} type="status" />
                  </div>

                  <h4 className="font-bold text-[#102A43] text-base leading-snug">{s.name}</h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Occupancy:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {s.occupancy} / {s.capacity} beds ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${occupancyPct > 85 ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, occupancyPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 pt-1">
                    <p><strong>Contact:</strong> {s.contact_person} (📞 {s.contact_phone})</p>
                    <p className="mt-1 text-[11px] text-slate-400 leading-normal">{s.facilities}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Allocation Reservation Confirmation Modal */}
      {allocatingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-[#102A43]">Confirm Emergency Resource Allocation</h4>
                <p className="text-xs text-slate-500">{allocatingResource.name}</p>
              </div>
              <button onClick={() => setAllocatingResource(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAllocation} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold text-slate-800">{allocatingResource.provider_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {allocatingResource.quantity} {allocatingResource.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Incident:</span>
                  <span className="font-semibold text-[#E63946]">Emergency #{selectedIncidentForMatch?.id}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity to Allocate ({allocatingResource.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={allocatingResource.quantity}
                  required
                  value={allocQty}
                  onChange={(e) => setAllocQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Prevents over-allocation: Maximum allowable {allocatingResource.quantity} {allocatingResource.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Instructions & Logistics Note
                </label>
                <textarea
                  rows={3}
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  placeholder="e.g. Escort via Police Boat Unit Alpha 2..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAllocatingResource(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Confirm & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Triage Modal */}
      {triageIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-[#102A43]">Incident Triage & Status Update</h4>
                <p className="text-xs text-slate-500">Emergency #{triageIncident.id} · {triageIncident.emergency_type}</p>
              </div>
              <button onClick={() => setTriageIncident(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTriage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Workflow *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                >
                  <option value="reported">Reported (Unverified)</option>
                  <option value="under_review">Under Review</option>
                  <option value="verified">Verified (Confirmed Incident)</option>
                  <option value="assigned">Assigned (Coordinator / Unit Assigned)</option>
                  <option value="in_progress">In Progress (Relief Dispatched)</option>
                  <option value="resolved">Resolved (Completed Rescue/Relief)</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Urgency *</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                >
                  <option value="critical">Critical (Immediate danger to life)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Triage Notes / Response Log</label>
                <textarea
                  rows={3}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Record verification details, contact confirmation, and assigned convoy..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTriageIncident(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Triage Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shelter Modal */}
      {showAddShelter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-[#102A43]">Register Emergency Shelter Hub</h4>
                <p className="text-xs text-slate-500">Provide official refuge details for public discovery</p>
              </div>
              <button onClick={() => setShowAddShelter(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShelter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shelter Facility Name *</label>
                <input
                  type="text"
                  required
                  value={shelterName}
                  onChange={(e) => setShelterName(e.target.value)}
                  placeholder="e.g. Municipal Indoor Sports Complex"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                  <select
                    value={shelterDistrict}
                    onChange={(e) => setShelterDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    <option value="Colombo">Colombo</option>
                    <option value="Gampaha">Gampaha</option>
                    <option value="Kalutara">Kalutara</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Galle">Galle</option>
                    <option value="Ratnapura">Ratnapura</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Capacity *</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={shelterCapacity}
                    onChange={(e) => setShelterCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={shelterContact}
                    onChange={(e) => setShelterContact(e.target.value)}
                    placeholder="Officer name"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={shelterPhone}
                    onChange={(e) => setShelterPhone(e.target.value)}
                    placeholder="+94 11 XXX XXXX"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddShelter(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Register Shelter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
