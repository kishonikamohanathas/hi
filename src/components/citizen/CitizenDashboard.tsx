import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ResourceItem, EmergencyIncident, ResourceCategory, NotificationItem } from '../../types';
import { MapComponent } from '../common/MapComponent';
import { StatusBadge } from '../common/StatusBadge';
import {
  Search,
  Filter,
  MapPin,
  Navigation,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Phone,
  Layers,
  ArrowRight,
  List,
  Map as MapIcon,
  X,
  AlertTriangle,
  User,
  HeartHandshake
} from 'lucide-react';

interface CitizenDashboardProps {
  initialTab?: string;
  onNavigateHome: () => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ initialTab = 'discover', onNavigateHome }) => {
  const { user, showToast } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'discover' | 'emergency' | 'map' | 'requests' | 'notifications' | 'profile'>(
    (initialTab as any) || 'discover'
  );

  // Discovery state
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 6.9271, // Colombo default
    longitude: 79.8612,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [requestModalResource, setRequestModalResource] = useState<ResourceItem | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestNotes, setRequestNotes] = useState('');

  // Emergency Form State
  const [emgType, setEmgType] = useState('Flood');
  const [emgPriority, setEmgPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('critical');
  const [emgDesc, setEmgDesc] = useState('');
  const [emgDistrict, setEmgDistrict] = useState(user?.district || 'Colombo');
  const [emgAddress, setEmgAddress] = useState('');
  const [emgPhone, setEmgPhone] = useState(user?.phone || '');
  const [emgPeople, setEmgPeople] = useState(4);
  const [emgCoords, setEmgCoords] = useState<{ lat: number; lng: number }>({
    lat: 6.945,
    lng: 79.91,
  });
  const [isSubmittingEmg, setIsSubmittingEmg] = useState(false);

  // My Requests State
  const [myEmergencies, setMyEmergencies] = useState<EmergencyIncident[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    loadCategories();
    loadNearbyResources();
    loadMyEmergencies();
    loadNotifications();

    // Attempt browser geolocation if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // If denied, fallback to Colombo coordinates
        }
      );
    }
  }, []);

  useEffect(() => {
    loadNearbyResources();
  }, [userLocation, radiusKm, selectedCategory, selectedDistrict, selectedType]);

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.categories);
    } catch {
      // ignore
    }
  };

  const loadNearbyResources = async () => {
    setLoading(true);
    try {
      const res = await api.getNearbyResources({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radius: radiusKm,
        category: selectedCategory || undefined,
        district: selectedDistrict || undefined,
        resource_type: selectedType || undefined,
      });
      setResources(res.results);
    } catch {
      // fallback to regular getResources
      const res = await api.getResources();
      setResources(res.resources);
    } finally {
      setLoading(false);
    }
  };

  const loadMyEmergencies = async () => {
    try {
      const res = await api.getEmergencies({ user_id: user?.id || '' });
      setMyEmergencies(res.emergencies);
    } catch {
      // ignore
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch {
      // ignore
    }
  };

  // Submit Emergency
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmg(true);
    try {
      await api.reportEmergency({
        emergency_type: emgType,
        priority: emgPriority,
        description: emgDesc,
        district: emgDistrict,
        address: emgAddress,
        contact_phone: emgPhone,
        people_affected: emgPeople,
        latitude: emgCoords.lat,
        longitude: emgCoords.lng,
      });

      showToast('Emergency reported successfully! Coordinators have been notified.', 'success');
      setEmgDesc('');
      setEmgAddress('');
      loadMyEmergencies();
      setActiveSubTab('requests');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit emergency report', 'error');
    } finally {
      setIsSubmittingEmg(false);
    }
  };

  // Submit Resource Direct Request
  const handleDirectResourceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalResource) return;

    try {
      // Create emergency incident linked to this resource request
      await api.reportEmergency({
        emergency_type: `Resource Request: ${requestModalResource.category}`,
        priority: 'high',
        description: `Direct request for ${requestQty} ${requestModalResource.unit} of "${requestModalResource.name}". Notes: ${requestNotes || 'Urgent requirement'}`,
        district: requestModalResource.district,
        address: user?.address || 'Community delivery location',
        contact_phone: user?.phone || '+94 77 123 4567',
        people_affected: requestQty,
        required_resources: requestModalResource.name,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      showToast(`Request for ${requestQty} ${requestModalResource.unit} dispatched to provider & coordination team!`, 'success');
      setRequestModalResource(null);
      loadMyEmergencies();
      setActiveSubTab('requests');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch request', 'error');
    }
  };

  const filteredResources = resources.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.district.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Citizen Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
            <span>GeoResQ Portal</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">Citizen & Resident Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold text-[#102A43]">
            Welcome, {user?.full_name || 'Community Resident'}
          </h2>
        </div>

        {/* Quick Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('discover')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'discover' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Discover Resources
          </button>
          <button
            onClick={() => setActiveSubTab('emergency')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'emergency' ? 'bg-[#E63946] text-white shadow-xs' : 'text-slate-600 hover:text-[#E63946]'
            }`}
          >
            Report Emergency
          </button>
          <button
            onClick={() => setActiveSubTab('map')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nearby Map
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'requests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Requests ({myEmergencies.length})
          </button>
          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'notifications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* 1. DISCOVER RESOURCES TAB */}
      {activeSubTab === 'discover' && (
        <div className="space-y-6">
          {/* Controls bar: Search, Radius, Category, District */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources by name, medicine, food..."
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                >
                  <option value="">All Resource Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                >
                  <option value="">All Districts</option>
                  <option value="Colombo">Colombo</option>
                  <option value="Gampaha">Gampaha</option>
                  <option value="Kalutara">Kalutara</option>
                  <option value="Kandy">Kandy</option>
                  <option value="Galle">Galle</option>
                  <option value="Ratnapura">Ratnapura</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
                      viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
                      viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Map View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Radius Slider & Quick Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Geospatial Search Radius:</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-32 accent-[#0F766E]"
                />
                <span className="font-mono tabular-nums font-bold text-[#0F766E]">{radiusKm} km</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedType('')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedType === '' ? 'bg-[#102A43] text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setSelectedType('free')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedType === 'free' ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Free Relief Supplies
                </button>
                <button
                  onClick={() => setSelectedType('paid')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedType === 'paid' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Subsidized / Paid
                </button>
              </div>
            </div>
          </div>

          {/* Results: Grid or Map */}
          {viewMode === 'map' ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>Displaying {filteredResources.length} verified supplies plotted within {radiusKm} km of your GPS location.</span>
                <span className="font-mono">Lat: {userLocation.latitude.toFixed(4)}, Lng: {userLocation.longitude.toFixed(4)}</span>
              </div>
              <MapComponent
                height="600px"
                userLocation={userLocation}
                resources={filteredResources}
                onSelectResource={(r) => setSelectedResource(r)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-900 font-mono tabular-nums">{filteredResources.length}</strong> resources (sorted nearest first)
                </span>
                <span>Coordinates: {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}</span>
              </div>

              {filteredResources.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <p className="text-base font-semibold text-slate-800">No resources matched your criteria within {radiusKm} km</p>
                  <p className="text-xs text-slate-500 mt-1">Try expanding the search radius slider or clearing category filters.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedDistrict('');
                      setSelectedType('');
                      setRadiusKm(80);
                    }}
                    className="mt-4 px-4 py-2 bg-[#102A43] text-white text-xs font-semibold rounded-lg"
                  >
                    Reset Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResources.map((resItem) => (
                    <div
                      key={resItem.id}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Image header with fallback */}
                        <div className="aspect-[16/9] w-full bg-slate-100 relative overflow-hidden">
                          <img
                            src={resItem.image_url || '/src/assets/images/relief_supply_distribution_1793849399746.jpg'}
                            alt={resItem.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-900 shadow-xs">
                            {resItem.resource_type === 'free' ? 'FREE' : `LKR ${resItem.price}`}
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                            <span className="font-semibold text-[#0F766E]">{resItem.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{resItem.district}</span>
                            {resItem.distance_km !== undefined && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums font-semibold text-[#2563EB]">
                                  {resItem.distance_km} km away
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="font-bold text-[#102A43] text-base mb-2 leading-snug line-clamp-1">
                            {resItem.name}
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                            {resItem.description}
                          </p>

                          <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Available Stock:</span>
                              <span className="font-mono tabular-nums font-bold text-slate-900">
                                {resItem.quantity} {resItem.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Provider:</span>
                              <span className="font-medium text-slate-800 truncate max-w-[170px]">
                                {resItem.provider_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0 flex items-center gap-2">
                        <button
                          onClick={() => setRequestModalResource(resItem)}
                          className="flex-1 py-2 px-3 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg transition-colors text-center"
                        >
                          Request Resource
                        </button>
                        <a
                          href={
                            resItem.directions_url ||
                            `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation.latitude}%2C${userLocation.longitude}%3B${resItem.latitude}%2C${resItem.longitude}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open navigation directions"
                          className="p-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. REPORT EMERGENCY ASSISTANCE TAB */}
      {activeSubTab === 'emergency' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#E63946] text-white p-6 rounded-2xl shadow-sm flex items-start gap-4">
            <ShieldAlert className="w-8 h-8 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold">Emergency Assistance & Incident Reporting</h3>
              <p className="text-xs text-red-100 leading-relaxed mt-1">
                Submitting this form immediately alerts all regional emergency coordinators, logs incident coordinates on the live command map, and queues automated resource allocation matches.
              </p>
            </div>
          </div>

          <form onSubmit={handleEmergencySubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Emergency Category *
                </label>
                <select
                  value={emgType}
                  onChange={(e) => setEmgType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                >
                  <option value="Flood">Flood / Water Inundation</option>
                  <option value="Landslide">Landslide / Earth Slip</option>
                  <option value="Fire">Fire / Structural Hazard</option>
                  <option value="Medical Emergency">Critical Medical Emergency / Mass Casualty</option>
                  <option value="Accident">Major Transportation Accident</option>
                  <option value="Food Shortage">Critical Food & Ration Depletion</option>
                  <option value="Water Shortage">Safe Drinking Water Shortage</option>
                  <option value="Shelter Requirement">Displaced Population / Shelter Needed</option>
                  <option value="Other">Other Civil Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Urgency Priority Level *
                </label>
                <select
                  value={emgPriority}
                  onChange={(e) => setEmgPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                >
                  <option value="critical">Critical (Immediate threat to life / Evacuation)</option>
                  <option value="high">High (Urgent medical or structural intervention)</option>
                  <option value="medium">Medium (Supplies required within 12-24 hours)</option>
                  <option value="low">Low (General community assistance)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  District *
                </label>
                <select
                  value={emgDistrict}
                  onChange={(e) => setEmgDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                >
                  <option value="Colombo">Colombo</option>
                  <option value="Gampaha">Gampaha</option>
                  <option value="Kalutara">Kalutara</option>
                  <option value="Kandy">Kandy</option>
                  <option value="Galle">Galle</option>
                  <option value="Ratnapura">Ratnapura</option>
                  <option value="Jaffna">Jaffna</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Estimated People Affected
                </label>
                <input
                  type="number"
                  min="1"
                  value={emgPeople}
                  onChange={(e) => setEmgPeople(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Emergency Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={emgPhone}
                  onChange={(e) => setEmgPhone(e.target.value)}
                  placeholder="+94 7X XXX XXXX"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Exact Street Address / Landmark *
              </label>
              <input
                type="text"
                required
                value={emgAddress}
                onChange={(e) => setEmgAddress(e.target.value)}
                placeholder="e.g. Near Kotikawatta Bridge, 2nd canal gate, Colombo Outer"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Incident Description & Urgency Details *
              </label>
              <textarea
                rows={4}
                required
                value={emgDesc}
                onChange={(e) => setEmgDesc(e.target.value)}
                placeholder="Describe current status, access road conditions, injured persons, children, and immediate supplies required..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
            </div>

            {/* Interactive Map Coordinate Pin Dropper */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Incident Coordinates (Click Map to Drop Exact Pin) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setEmgCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        showToast('Updated coordinates from device GPS', 'info');
                      });
                    }
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Use My Current GPS</span>
                </button>
              </div>

              <div className="mb-2 p-2.5 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 flex items-center justify-between">
                <span>Selected: Lat: {emgCoords.lat.toFixed(5)}, Lng: {emgCoords.lng.toFixed(5)}</span>
                <span className="text-[11px] text-slate-400">Click anywhere on the map below to adjust</span>
              </div>

              <MapComponent
                height="320px"
                selectable={true}
                selectedLocation={emgCoords}
                onSelectLocation={(c) => setEmgCoords(c)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingEmg}
              className="w-full py-3.5 px-6 bg-[#E63946] hover:bg-[#D90429] text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>{isSubmittingEmg ? 'Dispatching Emergency Alert...' : 'Submit Emergency Report Now'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. NEARBY MAP FULL TAB */}
      {activeSubTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[#102A43]">Live Geospatial Map Exploration</h3>
              <p className="text-xs text-slate-500">
                Explore relief supply depots, emergency incidents, and open shelters plotted on OpenStreetMap.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E63946]" />
                Emergency Incident
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
                Available Resource
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
                Emergency Shelter
              </span>
            </div>
          </div>

          <MapComponent
            height="650px"
            userLocation={userLocation}
            resources={resources}
            emergencies={myEmergencies}
          />
        </div>
      )}

      {/* 4. MY REQUESTS & EMERGENCIES TAB */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#102A43]">My Emergency Incidents & Requests</h3>
            <button
              onClick={() => setActiveSubTab('emergency')}
              className="px-3.5 py-1.5 bg-[#E63946] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#D90429] transition-colors"
            >
              + Report New Incident
            </button>
          </div>

          {myEmergencies.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No active emergency requests logged</p>
              <p className="text-xs text-slate-500 mt-1">If you require urgent assistance, submit an incident report.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myEmergencies.map((emg) => (
                <div
                  key={emg.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-500">#{emg.id}</span>
                      <h4 className="font-bold text-[#102A43] text-base">{emg.emergency_type}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">Priority:</span>
                      <StatusBadge status={emg.priority} type="priority" />
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500">Status:</span>
                      <StatusBadge status={emg.status} type="status" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {emg.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">District & Location</span>
                      <span className="font-semibold text-slate-800">{emg.district}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">People Affected</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">{emg.people_affected}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Assigned Coordinator</span>
                      <span className="font-semibold text-slate-800">{emg.assigned_coordinator_name || 'In Triage Queue'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Reported At</span>
                      <span className="font-semibold text-slate-800 font-mono">{emg.created_at?.split(' ')[0] || 'Today'}</span>
                    </div>
                  </div>

                  {emg.triage_notes && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
                      <strong>Coordinator Notes:</strong> {emg.triage_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. NOTIFICATIONS TAB */}
      {activeSubTab === 'notifications' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#102A43]">In-App Incident Notifications</h3>
            <button
              onClick={async () => {
                await api.markAllNotificationsRead();
                loadNotifications();
                showToast('Marked all alerts as read', 'info');
              }}
              className="text-xs text-[#2563EB] hover:underline"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border text-xs transition-colors ${
                  n.is_read ? 'bg-white border-slate-200 text-slate-600' : 'bg-blue-50/70 border-blue-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-[#102A43]">{n.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{n.created_at?.split(' ')[0]}</span>
                </div>
                <p className="leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Request Modal */}
      {requestModalResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-[#102A43]">Request Resource Assistance</h4>
                <p className="text-xs text-slate-500">{requestModalResource.name}</p>
              </div>
              <button
                onClick={() => setRequestModalResource(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectResourceRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Required ({requestModalResource.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={requestModalResource.quantity}
                  value={requestQty}
                  onChange={(e) => setRequestQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Available in depot: {requestModalResource.quantity} {requestModalResource.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgency & Delivery Location Notes
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Flooded household, urgent requirement for infants..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRequestModalResource(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Dispatch Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
