import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ResourceItem, Allocation, ResourceCategory } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { MapComponent } from '../common/MapComponent';
import {
  Package,
  PlusCircle,
  Truck,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  MapPin,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { user, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'add' | 'allocations'>('overview');
  const [myResources, setMyResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Add/Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food & Drinking Water');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState('Bottles (5L)');
  const [resourceType, setResourceType] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState<number>(0);
  const [district, setDistrict] = useState(user?.district || 'Colombo');
  const [address, setAddress] = useState(user?.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 6.9538, lng: 79.9164 });
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, allocData, catData] = await Promise.all([
        api.getMyResources(),
        api.getAllocations({ provider_id: user?.id || '' }),
        api.getCategories(),
      ]);
      setMyResources(resData.resources);
      setAllocations(allocData.allocations);
      setCategories(catData.categories);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setQuantity(100);
    setUnit('Bottles (5L)');
    setResourceType('free');
    setPrice(0);
    setExpiryDate('');
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateResource(editingId, {
          name,
          category,
          description,
          quantity,
          unit,
          price: resourceType === 'free' ? 0 : price,
          resource_type: resourceType,
          district,
          address,
          latitude: coords.lat,
          longitude: coords.lng,
          expiry_date: expiryDate,
        });
        showToast('Resource updated successfully', 'success');
      } else {
        await api.createResource({
          name,
          category,
          description,
          quantity,
          unit,
          price: resourceType === 'free' ? 0 : price,
          resource_type: resourceType,
          district,
          address,
          latitude: coords.lat,
          longitude: coords.lng,
          expiry_date: expiryDate,
        });
        showToast('New relief resource published successfully', 'success');
      }
      resetForm();
      setActiveTab('manage');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save resource', 'error');
    }
  };

  const handleEditClick = (resItem: ResourceItem) => {
    setEditingId(resItem.id);
    setName(resItem.name);
    setCategory(resItem.category);
    setDescription(resItem.description);
    setQuantity(resItem.quantity);
    setUnit(resItem.unit);
    setResourceType(resItem.resource_type);
    setPrice(resItem.price);
    setDistrict(resItem.district);
    setAddress(resItem.address || '');
    setCoords({ lat: resItem.latitude, lng: resItem.longitude });
    setExpiryDate(resItem.expiry_date || '');
    setActiveTab('add');
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to remove this resource listing?')) return;
    try {
      await api.deleteResource(id);
      showToast('Resource listing removed', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete resource', 'error');
    }
  };

  const handleUpdateAllocationStatus = async (allocId: string, newStatus: string) => {
    try {
      await api.updateAllocationStatus(allocId, { status: newStatus });
      showToast(`Allocation status marked as '${newStatus}'`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Metrics
  const totalUnitsStocked = myResources.reduce((sum, r) => sum + r.quantity, 0);
  const activeListings = myResources.filter((r) => r.availability === 'available').length;
  const inTransitCount = allocations.filter((a) => a.status === 'in_transit' || a.status === 'allocated').length;
  const deliveredCount = allocations.filter((a) => a.status === 'delivered' || a.status === 'completed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
            <span>GeoResQ Logistics Hub</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">Resource Provider Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold text-[#102A43]">
            {user?.organization_name || user?.full_name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setActiveTab('add');
            }}
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish New Resource</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Depot Overview
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'manage' ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Manage Stock ({myResources.length})
        </button>
        <button
          onClick={() => setActiveTab('allocations')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'allocations' ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Inbound Dispatches & Allocations ({allocations.length})
        </button>
        <button
          onClick={() => {
            resetForm();
            setActiveTab('add');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'add' ? 'bg-[#102A43] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {editingId ? 'Edit Resource' : 'Add Resource'}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Listings</span>
              <p className="text-3xl font-extrabold text-[#102A43] font-mono tabular-nums mt-1">{activeListings}</p>
              <p className="text-[11px] text-slate-400 mt-1">Available on public map</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Units in Stock</span>
              <p className="text-3xl font-extrabold text-[#0F766E] font-mono tabular-nums mt-1">{totalUnitsStocked}</p>
              <p className="text-[11px] text-slate-400 mt-1">Real-time inventory</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatches In Transit</span>
              <p className="text-3xl font-extrabold text-[#F59E0B] font-mono tabular-nums mt-1">{inTransitCount}</p>
              <p className="text-[11px] text-slate-400 mt-1">En route to emergency zones</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Deliveries</span>
              <p className="text-3xl font-extrabold text-[#2563EB] font-mono tabular-nums mt-1">{deliveredCount}</p>
              <p className="text-[11px] text-slate-400 mt-1">Successfully handed over</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-[#102A43] text-base">Quick Depot Inventory Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Resource Item</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold">Stock</th>
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myResources.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3 px-4 text-slate-600">{r.category}</td>
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="py-3 px-4">
                        {r.resource_type === 'free' ? 'Free Relief' : `LKR ${r.price}`}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.availability} type="availability" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleEditClick(r)}
                          className="text-[#2563EB] hover:underline font-semibold"
                        >
                          Edit Stock
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

      {/* TAB 2: MANAGE STOCK */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#102A43]">All Depot Inventory Listings</h3>
            <button
              onClick={() => {
                resetForm();
                setActiveTab('add');
              }}
              className="text-xs font-semibold text-[#0F766E] hover:underline"
            >
              + Add New Listing
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Resource Details</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Available Stock</th>
                    <th className="py-3 px-4 font-semibold">Location / District</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myResources.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{r.description}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{r.category}</td>
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.district}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.availability} type="availability" />
                      </td>
                      <td className="py-3 px-4 text-right space-x-3">
                        <button
                          onClick={() => handleEditClick(r)}
                          className="text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(r.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4 inline" />
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

      {/* TAB 3: ADD / EDIT RESOURCE */}
      {activeTab === 'add' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#102A43]">
                  {editingId ? 'Edit Relief Resource Listing' : 'Publish New Disaster Relief Resource'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplies will be discoverable by emergency coordinators and nearby citizens.
                </p>
              </div>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveResource} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 5L Sterile Packaged Drinking Water"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Specifications *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details regarding quality, storage temperature, packaging, packaging sizes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Available *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measurement *
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. Bottles, Boxes, Kits, Units"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="free">Free Donation</option>
                    <option value="paid">Subsidized / Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price in LKR (if paid)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={resourceType === 'free'}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E] disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Warehouse / Depot Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 14 Kelaniya Depot Road, Colombo Outer"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Map Coordinates Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Depot GPS Coordinates (Click on Map to Drop Exact Pin) *
                </label>
                <div className="p-2 mb-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-600">
                  Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                </div>
                <MapComponent
                  height="260px"
                  selectable={true}
                  selectedLocation={coords}
                  onSelectLocation={(c) => setCoords(c)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                {editingId ? 'Save Resource Updates' : 'Publish to GeoResQ Emergency Catalog'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: INBOUND DISPATCHES & ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#102A43]">
            Emergency Allocations Dispatched from Your Depots
          </h3>

          {allocations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No emergency dispatches yet</p>
              <p className="text-xs text-slate-500 mt-1">When emergency coordinators allocate from your stock, dispatches will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allocations.map((a) => (
                <div
                  key={a.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-400">#{a.id}</span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {a.allocated_quantity} {a.unit} of {a.resource_name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <StatusBadge status={a.status} type="status" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Incident Target</span>
                      <span className="font-semibold text-slate-900">Emergency #{a.emergency_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Requester / Clinic</span>
                      <span className="font-semibold text-slate-900">{a.requester_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Authorized By</span>
                      <span className="font-semibold text-slate-900">{a.coordinator_name || 'Emergency Command'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Calculated Distance</span>
                      <span className="font-mono tabular-nums font-semibold text-blue-700">{a.distance_km} km</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">{a.notes}</span>
                    <div className="flex items-center gap-2">
                      {a.status === 'allocated' && (
                        <button
                          onClick={() => handleUpdateAllocationStatus(a.id, 'in_transit')}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-md shadow-xs"
                        >
                          Mark In-Transit
                        </button>
                      )}
                      {(a.status === 'allocated' || a.status === 'in_transit') && (
                        <button
                          onClick={() => handleUpdateAllocationStatus(a.id, 'delivered')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs"
                        >
                          Confirm Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
