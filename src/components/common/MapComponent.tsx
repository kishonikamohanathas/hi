import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ResourceItem, EmergencyIncident, ShelterItem } from '../../types';

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  userLocation?: { latitude: number; longitude: number } | null;
  resources?: ResourceItem[];
  emergencies?: EmergencyIncident[];
  shelters?: ShelterItem[];
  selectable?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
  onSelectLocation?: (coords: { lat: number; lng: number }) => void;
  onSelectResource?: (resource: ResourceItem) => void;
  onSelectEmergency?: (emergency: EmergencyIncident) => void;
  height?: string;
  className?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  center = [6.9271, 79.8612], // Default Sri Lanka Colombo coordinates
  zoom = 12,
  userLocation,
  resources = [],
  emergencies = [],
  shelters = [],
  selectable = false,
  selectedLocation,
  onSelectLocation,
  onSelectResource,
  onSelectEmergency,
  height = '500px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: userLocation ? [userLocation.latitude, userLocation.longitude] : center,
        zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map on click if selectable
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (selectable && onSelectLocation) {
        onSelectLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [selectable, onSelectLocation]);

  // Render markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const bounds: [number, number][] = [];

    // Custom Icon Generators
    const createMarkerIcon = (bgColor: string, symbol: string, size = 32) => {
      return L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background-color: ${bgColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            font-weight: 700;
          ">
            ${symbol}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
    };

    // 1. User Location Marker
    if (userLocation) {
      const userLatLng: [number, number] = [userLocation.latitude, userLocation.longitude];
      bounds.push(userLatLng);

      const userIcon = L.divIcon({
        className: 'user-location-icon',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              background-color: rgba(37, 99, 235, 0.3);
              border-radius: 50%;
              animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: absolute;
              top: 4px;
              left: 4px;
              width: 16px;
              height: 16px;
              background-color: #2563EB;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker(userLatLng, { icon: userIcon })
        .bindPopup(`
          <div style="padding: 12px; font-family: sans-serif;">
            <div style="font-weight: 700; font-size: 14px; color: #102A43;">📍 Your Current Location</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Lat: ${userLocation.latitude.toFixed(4)}, Lng: ${userLocation.longitude.toFixed(4)}</div>
          </div>
        `)
        .addTo(markersGroup);
    }

    // 2. Selected Location Marker (for reporting or manual pin)
    if (selectedLocation) {
      const selLatLng: [number, number] = [selectedLocation.lat, selectedLocation.lng];
      bounds.push(selLatLng);
      const selIcon = createMarkerIcon('#E63946', '📌', 34);
      L.marker(selLatLng, { icon: selIcon })
        .bindPopup(`
          <div style="padding: 12px; font-family: sans-serif;">
            <div style="font-weight: 700; font-size: 13px; color: #E63946;">Selected Incident Point</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 2px;">${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}</div>
          </div>
        `)
        .addTo(markersGroup);
    }

    // 3. Emergency Incident Markers
    emergencies.forEach((emg) => {
      const emgLatLng: [number, number] = [emg.latitude, emg.longitude];
      bounds.push(emgLatLng);

      const color =
        emg.priority === 'critical'
          ? '#E63946'
          : emg.priority === 'high'
          ? '#F59E0B'
          : '#2563EB';

      const icon = createMarkerIcon(color, '⚠️', 30);
      const marker = L.marker(emgLatLng, { icon }).addTo(markersGroup);

      const popupHtml = `
        <div style="padding: 14px; min-width: 220px; font-family: sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${color};">
              ${emg.priority} Priority · ${emg.emergency_type}
            </span>
            <span style="font-size: 10px; color: #64748B;">${emg.status}</span>
          </div>
          <div style="font-weight: 700; font-size: 14px; color: #102A43; margin-bottom: 4px;">
            ${emg.emergency_type} in ${emg.district}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 8px; max-height: 80px; overflow: hidden; text-overflow: ellipsis;">
            ${emg.description}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            👥 <strong>${emg.people_affected}</strong> people affected · 📞 ${emg.contact_phone}
          </div>
          <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation?.latitude || 6.9271}%2C${userLocation?.longitude || 79.8612}%3B${emg.latitude}%2C${emg.longitude}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background-color: #102A43; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">
            Get Route Directions ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      if (onSelectEmergency) {
        marker.on('click', () => onSelectEmergency(emg));
      }
    });

    // 4. Resource Markers
    resources.forEach((resItem) => {
      const resLatLng: [number, number] = [resItem.latitude, resItem.longitude];
      bounds.push(resLatLng);

      const color = resItem.availability === 'available' ? '#0F766E' : '#94A3B8';
      const icon = createMarkerIcon(color, '📦', 28);
      const marker = L.marker(resLatLng, { icon }).addTo(markersGroup);

      const directionsUrl =
        resItem.directions_url ||
        `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation?.latitude || 6.9271}%2C${userLocation?.longitude || 79.8612}%3B${resItem.latitude}%2C${resItem.longitude}`;

      const popupHtml = `
        <div style="padding: 14px; min-width: 220px; font-family: sans-serif;">
          <div style="font-size: 11px; color: #0F766E; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">
            ${resItem.category} · ${resItem.resource_type === 'free' ? 'FREE' : `LKR ${resItem.price}`}
          </div>
          <div style="font-weight: 700; font-size: 14px; color: #102A43; margin-bottom: 4px;">
            ${resItem.name}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
            Stock: <strong>${resItem.quantity} ${resItem.unit}</strong> available
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            📍 ${resItem.district} ${resItem.distance_km !== undefined ? `· <strong>${resItem.distance_km} km away</strong>` : ''}
          </div>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background-color: #0F766E; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">
            Navigate to Resource ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      if (onSelectResource) {
        marker.on('click', () => onSelectResource(resItem));
      }
    });

    // 5. Shelter Markers
    shelters.forEach((shelter) => {
      const shelterLatLng: [number, number] = [shelter.latitude, shelter.longitude];
      bounds.push(shelterLatLng);

      const icon = createMarkerIcon('#6366F1', '🏠', 28);
      const marker = L.marker(shelterLatLng, { icon }).addTo(markersGroup);

      const popupHtml = `
        <div style="padding: 14px; min-width: 200px; font-family: sans-serif;">
          <div style="font-size: 11px; color: #6366F1; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">
            Emergency Shelter · ${shelter.status.toUpperCase()}
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #102A43; margin-bottom: 4px;">
            ${shelter.name}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
            Capacity: ${shelter.occupancy} / ${shelter.capacity} people (${Math.round((shelter.occupancy / shelter.capacity) * 100)}% full)
          </div>
          <div style="font-size: 11px; color: #64748B;">
            📞 Contact: ${shelter.contact_phone || 'Emergency Hub'}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
    });

    // Fit map view if multiple markers exist
    if (bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch {
        // ignore bounds fit error
      }
    } else if (bounds.length === 1) {
      map.setView(bounds[0], zoom);
    }
  }, [userLocation, selectedLocation, resources, emergencies, shelters]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {selectable && (
        <div className="absolute top-3 left-14 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <span>Click anywhere on the map to pin incident location</span>
        </div>
      )}
    </div>
  );
};
