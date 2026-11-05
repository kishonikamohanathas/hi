export type UserRole = 'citizen' | 'provider' | 'coordinator' | 'admin';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'pending_verification' | 'suspended';
  district?: string;
  address?: string;
  organization_name?: string;
  verification_notes?: string;
  created_at?: string;
}

export interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  urgency_level: 'critical' | 'high' | 'medium' | 'low';
}

export interface ResourceItem {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_phone?: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  original_quantity: number;
  unit: string;
  price: number;
  resource_type: 'free' | 'paid';
  latitude: number;
  longitude: number;
  district: string;
  address?: string;
  availability: 'available' | 'reserved' | 'exhausted' | 'pending_approval';
  is_approved: number;
  expiry_date?: string;
  image_url?: string;
  distance_km?: number;
  directions_url?: string;
  created_at?: string;
}

export interface EmergencyIncident {
  id: string;
  user_id: string;
  requester_name: string;
  contact_phone: string;
  emergency_type: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  latitude: number;
  longitude: number;
  district: string;
  address?: string;
  people_affected: number;
  required_resources?: string;
  status: 'reported' | 'under_review' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assigned_coordinator_id?: string;
  assigned_coordinator_name?: string;
  triage_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Allocation {
  id: string;
  emergency_id: string;
  resource_id: string;
  resource_name: string;
  provider_id: string;
  provider_name: string;
  requester_id: string;
  requester_name: string;
  coordinator_id?: string;
  coordinator_name?: string;
  allocated_quantity: number;
  unit: string;
  distance_km?: number;
  status: 'pending' | 'approved' | 'allocated' | 'in_transit' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  allocated_at?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'emergency_alert' | 'request_update' | 'allocation_update' | 'provider_status' | 'system';
  reference_id?: string;
  is_read: number;
  created_at: string;
}

export interface ShelterItem {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  contact_person?: string;
  contact_phone?: string;
  status: 'open' | 'full' | 'evacuating' | 'closed';
  facilities?: string;
}

export interface VolunteerItem {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  skills: string;
  district: string;
  latitude: number;
  longitude: number;
  availability_status: 'available' | 'deployed' | 'off_duty';
  assigned_emergency_id?: string;
}

export interface PlatformMetrics {
  total_users: number;
  active_providers: number;
  total_resources: number;
  available_resources: number;
  total_emergencies: number;
  active_emergencies: number;
  resolved_emergencies: number;
  total_allocations: number;
  completed_allocations: number;
  response_rate_percent: number;
}
