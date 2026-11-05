import React from 'react';
import { ShieldAlert, MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#102A43] text-white border-t border-slate-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Col 1: Brand & Mission */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#E63946] flex items-center justify-center text-white">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Geo<span className="text-[#E63946]">ResQ</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Intelligent geospatial resource discovery, emergency coordination, and relief distribution system connecting citizens, providers, and response teams.
            </p>
            <div className="text-xs text-slate-400">
              National Disaster Management Support Initiative
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200 mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('discover')} className="hover:text-white transition-colors">
                  Resource Discovery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('emergency')} className="hover:text-[#E63946] transition-colors">
                  Report Emergency
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('map')} className="hover:text-white transition-colors">
                  Live Geospatial Map
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors">
                  Role Dashboards
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resource Categories */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200 mb-4">
              Relief Categories
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>Drinking Water & Dry Rations</li>
              <li>Emergency Medicines & IV Kits</li>
              <li>Blood Bank Cold-Chain Units</li>
              <li>Inflatable Flood Rescue Boats</li>
              <li>Shelter Tents & Disaster Bedding</li>
              <li>Power Generators & Pumps</li>
            </ul>
          </div>

          {/* Col 4: Emergency Contacts & Legal Disclaimer */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-200 mb-4">
              Emergency Hotlines
            </h4>
            <div className="space-y-2.5 text-sm text-slate-300 mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#E63946]" />
                <span className="font-mono tabular-nums">117 / +94 11 213 6136</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>ops@georesq.org</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Disaster Management Centre, Vidya Mawatha, Colombo 07</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-normal border-t border-slate-700/60 pt-3">
              GeoResQ facilitates rapid community resource discovery and coordination. In life-threatening emergencies, also notify official civil emergency services immediately.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; 2026 GeoResQ Emergency Coordination Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Leaflet & OpenStreetMap</span>
            <span>·</span>
            <span>Microservices Architecture</span>
            <span>·</span>
            <span>Haversine Spatial Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
