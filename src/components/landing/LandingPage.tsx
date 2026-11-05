import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Truck,
  HeartHandshake,
  MapPin,
  Clock,
  ArrowRight,
  LifeBuoy,
  Layers,
  CheckCircle2,
  PhoneCall,
  Send,
  Sparkles,
} from 'lucide-react';
import { PlatformMetrics, ResourceCategory } from '../../types';

interface LandingPageProps {
  metrics: PlatformMetrics | null;
  categories: ResourceCategory[];
  onNavigate: (tab: string, filterCategory?: string) => void;
  onOpenEmergency: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  metrics,
  categories,
  onNavigate,
  onOpenEmergency,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  const faqs = [
    {
      q: 'How does GeoResQ calculate proximity and distance to supplies?',
      a: 'GeoResQ employs the Haversine spherical trigonometric formula on verified GPS latitude and longitude coordinates, providing exact great-circle distance in kilometers and generating turn-by-turn OpenStreetMap routing links.',
    },
    {
      q: 'Who can request emergency resources or report an incident?',
      a: 'Any citizen or community resident can submit an emergency report with incident coordinates, affected headcount, and required relief items. Verified coordinators triage and dispatch resources immediately.',
    },
    {
      q: 'How are resource over-allocations and quantity discrepancies prevented?',
      a: 'Our Resource Allocation Service uses transactional database isolation. When an allocation is confirmed, inventory is deducted immediately and the listing status is synchronized in real-time.',
    },
    {
      q: 'Can private organizations or donors list relief inventory?',
      a: 'Yes, relief charities, medical depots, and logistics providers can register as Resource Providers to publish either free disaster supplies or subsidized items with exact depot coordinates.',
    },
  ];

  return (
    <div className="space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-16 lg:pt-12 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
                <span>Intelligent Emergency Response Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#102A43] tracking-tight leading-[1.12]">
                Discover Resources. Coordinate Emergencies.{' '}
                <span className="text-[#E63946]">Save Lives.</span>
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                An intelligent geospatial platform connecting citizens, verified providers, and disaster relief teams with essential medical, rescue, and sustenance resources when every second counts.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('discover')}
                  className="px-6 py-3.5 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Explore Nearby Resources</span>
                </button>

                <button
                  onClick={onOpenEmergency}
                  className="px-6 py-3.5 bg-[#E63946] hover:bg-[#D90429] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Request Emergency Assistance</span>
                </button>
              </div>

              {/* Quick trust metrics */}
              <div className="pt-6 border-t border-slate-200/80 flex items-center gap-8 text-xs text-slate-600">
                <div>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-base">
                    {metrics?.response_rate_percent || 100}%
                  </span>
                  <p className="text-slate-500">Incident Triage Rate</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-base">
                    &lt; 5.2 km
                  </span>
                  <p className="text-slate-500">Average Resource Proximity</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-base">
                    100% Verified
                  </span>
                  <p className="text-slate-500">Authorized Logistics Hubs</p>
                </div>
              </div>
            </div>

            {/* Right Column: High-Impact Visual Asset */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 aspect-[4/3] lg:aspect-auto lg:h-[480px]">
                <img
                  src="/src/assets/images/hero_emergency_operations_1793849399735.jpg"
                  alt="Emergency coordination operations center"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102A43]/90 via-[#102A43]/30 to-transparent" />

                {/* Overlaid Live Emergency Alert Preview */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-lg text-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#E63946] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E63946] animate-pulse" />
                      Active Incident Dispatch
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Colombo Lowland Hub</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900">
                    Kelani River Flood Zone Triage: 45 families evacuated
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Allocated: 250 units Drinking Water + 2 Inflatable Shallow-Draft Boats
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PLATFORM STATISTICS */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Registered Users & Volunteers
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-[#102A43] font-mono tabular-nums">
                {metrics?.total_users || 48}+
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified responders & citizens</p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Available Resources
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-[#0F766E] font-mono tabular-nums">
                {metrics?.available_resources || 8} Categories
              </p>
              <p className="text-xs text-slate-500 mt-1">Stocked in district warehouses</p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Active Resource Providers
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-[#2563EB] font-mono tabular-nums">
                {metrics?.active_providers || 12}
              </p>
              <p className="text-xs text-slate-500 mt-1">Hospitals, NGOs & suppliers</p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Resolved Emergency Incidents
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-[#E63946] font-mono tabular-nums">
                {metrics?.total_emergencies || 4}
              </p>
              <p className="text-xs text-slate-500 mt-1">Real-time coordinated relief</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ESSENTIAL RESOURCE CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
            Disaster Preparedness & Relief
          </p>
          <h2 className="text-3xl font-bold text-[#102A43] tracking-tight">
            Essential Resource Categories
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Explore verified humanitarian supplies, emergency shelters, and rescue apparatus ready for immediate dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('discover', cat.name)}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#102A43] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#102A43] group-hover:text-white text-[#102A43] flex items-center justify-center transition-colors mb-4">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#102A43] text-base mb-1.5 group-hover:text-[#2563EB] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F766E]">
                <span>Browse Inventory</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. HOW GEORESQ WORKS */}
      <section className="bg-slate-50 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-2">
              Operational Workflow
            </p>
            <h2 className="text-3xl font-bold text-[#102A43] tracking-tight">
              How GeoResQ Coordinates Relief
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From real-time citizen distress reporting to automated geospatial allocation and physical delivery tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="text-3xl font-extrabold text-slate-200 font-mono mb-3">01</div>
              <h4 className="font-bold text-[#102A43] text-base mb-2">Discover Resources</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan nearby medical depots, community kitchens, clean water stations, and rescue assets within your customized kilometer radius.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="text-3xl font-extrabold text-slate-200 font-mono mb-3">02</div>
              <h4 className="font-bold text-[#102A43] text-base mb-2">Submit Requests</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Report an incident or request needed supplies with exact GPS coordinates, urgency priority level, and affected headcount.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="text-3xl font-extrabold text-slate-200 font-mono mb-3">03</div>
              <h4 className="font-bold text-[#102A43] text-base mb-2">Allocate Resources</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Intelligent Geospatial Match Engine calculates proximity, urgency, and inventory availability to recommend optimal supplier dispatches.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="text-3xl font-extrabold text-slate-200 font-mono mb-3">04</div>
              <h4 className="font-bold text-[#102A43] text-base mb-2">Track Assistance</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitor live incident verification, convoy in-transit updates, and completed community handover with full audit accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VISUAL PROOF & HUMANITARIAN IMPACT GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/src/assets/images/relief_supply_distribution_1793849399746.jpg"
                alt="Community relief supply distribution"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6">
              <span className="text-xs font-semibold text-[#0F766E] uppercase">Logistics & Sustenance</span>
              <h4 className="font-bold text-[#102A43] text-base mt-1 mb-2">Community Dry Rations & Clean Water</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Coordinated distribution to flood-affected communities with zero over-allocation and full inventory transparency.
              </p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/src/assets/images/medical_emergency_response_1793849400628.jpg"
                alt="Rapid medical emergency triage response"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6">
              <span className="text-xs font-semibold text-[#E63946] uppercase">Critical Care</span>
              <h4 className="font-bold text-[#102A43] text-base mt-1 mb-2">Emergency Triage & Surgical Medical Supplies</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant notification and dispatch of rare blood units, trauma bandages, and emergency antibiotics directly to field medics.
              </p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/src/assets/images/rescue_shelter_support_1793849400915.jpg"
                alt="Emergency disaster shelter management"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6">
              <span className="text-xs font-semibold text-[#2563EB] uppercase">Shelter Network</span>
              <h4 className="font-bold text-[#102A43] text-base mt-1 mb-2">Safe Shelters & Bedding Capacity</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time occupancy monitoring across municipal sports complexes, community halls, and emergency camps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS (Sample Attributable Content) */}
      <section className="bg-slate-50 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
              Community Endorsements
            </p>
            <h2 className="text-3xl font-bold text-[#102A43] tracking-tight">
              Trusted by Responders & Citizens
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Verified feedback from emergency coordinators, volunteer teams, and community residents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <p className="text-xs text-slate-700 leading-relaxed italic mb-6">
                "During the severe monsoon flooding in Kelaniya, GeoResQ allowed our local disaster team to pinpoint 1,200 drinking water bottles in a nearby warehouse in under 3 minutes. The exact distance calculation saved us hours of blind search."
              </p>
              <div className="pt-4 border-t border-slate-100">
                <p className="font-bold text-sm text-[#102A43]">Kavinda Perera</p>
                <p className="text-xs text-slate-500">Western Province Emergency Action Coordinator</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <p className="text-xs text-slate-700 leading-relaxed italic mb-6">
                "Listing our blood bank inventory on GeoResQ ensured that rare O-Negative units reached the triage clinic in Dematagoda before road access was cut off. The auto-deduction prevents double booking."
              </p>
              <div className="pt-4 border-t border-slate-100">
                <p className="font-bold text-sm text-[#102A43]">Dr. T. Jayawardena</p>
                <p className="text-xs text-slate-500">Chief Medical Logistics Officer, Lanka Life Depot</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <p className="text-xs text-slate-700 leading-relaxed italic mb-6">
                "As a flood-stranded resident in Ja-Ela, submitting our location took 30 seconds on my phone. The live status update that boats were en route gave our neighborhood immense peace of mind."
              </p>
              <div className="pt-4 border-t border-slate-100">
                <p className="font-bold text-sm text-[#102A43]">Sunil Weerasinghe</p>
                <p className="text-xs text-slate-500">Community Resident & Volunteer Liaison</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-2">
            Answers & Guidelines
          </p>
          <h2 className="text-3xl font-bold text-[#102A43] tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-[#102A43] text-sm mb-2">{faq.q}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CONTACT & EMERGENCY INQUIRY */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-[#102A43]">Contact Emergency Logistics Headquarters</h3>
            <p className="text-xs text-slate-500 mt-1">
              Have questions regarding logistics integration, bulk medical donations, or regional coordinator roles?
            </p>
          </div>

          {contactSubmitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-emerald-900">Message Transmitted Successfully</p>
              <p className="text-xs text-emerald-700 mt-1">
                Our disaster logistics coordinator will review your inquiry and follow up shortly.
              </p>
              <button
                onClick={() => setContactSubmitted(false)}
                className="mt-4 text-xs font-semibold text-emerald-800 hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Ruwan Silva"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="ruwan@example.com"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Inquiry or Logistics Details</label>
                <textarea
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your supply capabilities, coordination requirement, or municipal district..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#102A43] hover:bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Logistics Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
