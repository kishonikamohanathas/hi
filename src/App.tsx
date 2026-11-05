import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import { ResourceCategory, PlatformMetrics } from './types';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { CitizenDashboard } from './components/citizen/CitizenDashboard';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { CoordinatorDashboard } from './components/coordinator/CoordinatorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MapComponent } from './components/common/MapComponent';
import { User, MapPin, Mail, Phone, Building, CheckCircle2 } from 'lucide-react';

function MainApp() {
  const { user, toast, openAuthModal, updateProfile } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Profile Form state
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDistrict, setProfileDistrict] = useState(user?.district || 'Colombo');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileOrg, setProfileOrg] = useState(user?.organization_name || '');

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name);
      setProfilePhone(user.phone || '');
      setProfileDistrict(user.district || 'Colombo');
      setProfileAddress(user.address || '');
      setProfileOrg(user.organization_name || '');
    }
  }, [user]);

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    try {
      const [cats, analytics] = await Promise.all([
        api.getCategories(),
        api.getAnalyticsOverview(),
      ]);
      setCategories(cats.categories);
      setMetrics(analytics.metrics);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      api.getNotifications().then((res) => {
        setUnreadCount(res.unread_count);
      }).catch(() => {});
    }
  }, [user, currentTab]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: profileName,
      phone: profilePhone,
      district: profileDistrict,
      address: profileAddress,
      organization_name: profileOrg,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-[#172B4D]">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-[#102A43] text-white border-slate-700'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        unreadCount={unreadCount}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <>
            <LandingPage
              metrics={metrics}
              categories={categories}
              onNavigate={(tab, cat) => {
                setCurrentTab(tab);
              }}
              onOpenEmergency={() => {
                setCurrentTab('emergency');
              }}
            />
            <Footer onNavigate={setCurrentTab} />
          </>
        )}

        {currentTab === 'discover' && (
          <CitizenDashboard
            initialTab="discover"
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'emergency' && (
          <CitizenDashboard
            initialTab="emergency"
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'map' && (
          <CitizenDashboard
            initialTab="map"
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'requests' && (
          <CitizenDashboard
            initialTab="requests"
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'notifications' && (
          <CitizenDashboard
            initialTab="notifications"
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'dashboard' && (
          <>
            {user?.role === 'admin' && <AdminDashboard />}
            {user?.role === 'coordinator' && <CoordinatorDashboard />}
            {user?.role === 'provider' && <ProviderDashboard />}
            {(!user || user?.role === 'citizen') && (
              <CitizenDashboard
                initialTab="discover"
                onNavigateHome={() => setCurrentTab('home')}
              />
            )}
          </>
        )}

        {currentTab === 'profile' && user && (
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-14 h-14 rounded-full bg-[#102A43] text-white flex items-center justify-center font-bold text-xl">
                  {user.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#102A43]">{user.full_name}</h3>
                  <p className="text-xs text-slate-500">
                    {user.email} · <span className="uppercase font-semibold text-[#0F766E]">{user.role}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                    <select
                      value={profileDistrict}
                      onChange={(e) => setProfileDistrict(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
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
                </div>

                {user.role === 'provider' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Depot Name</label>
                    <input
                      type="text"
                      value={profileOrg}
                      onChange={(e) => setProfileOrg(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
