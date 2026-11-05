import {
  User,
  ResourceCategory,
  ResourceItem,
  EmergencyIncident,
  Allocation,
  NotificationItem,
  ShelterItem,
  VolunteerItem,
  PlatformMetrics,
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('georesq_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: any) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  demoLogin: (role: string) =>
    request<{ token: string; user: User }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  updateProfile: (profile: Partial<User>) =>
    request<{ user: User; message: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  // Users (Admin)
  getUsers: (params?: { role?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ users: User[] }>(`/users${query ? `?${query}` : ''}`);
  },

  updateUser: (id: string, updates: Partial<User>) =>
    request<{ user: User; message: string }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Resources
  getCategories: () => request<{ categories: ResourceCategory[] }>('/resources/categories'),

  getResources: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ resources: ResourceItem[] }>(`/resources${query ? `?${query}` : ''}`);
  },

  getMyResources: () => request<{ resources: ResourceItem[] }>('/resources/my-resources'),

  getResourceById: (id: string) => request<{ resource: ResourceItem }>(`/resources/${id}`),

  createResource: (resource: Partial<ResourceItem>) =>
    request<{ resource: ResourceItem; message: string }>('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    }),

  updateResource: (id: string, updates: Partial<ResourceItem>) =>
    request<{ resource: ResourceItem; message: string }>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteResource: (id: string) =>
    request<{ message: string }>(`/resources/${id}`, {
      method: 'DELETE',
    }),

  // Geospatial
  getNearbyResources: (params: {
    lat: number;
    lng: number;
    radius?: number;
    category?: string;
    district?: string;
    resource_type?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{
      user_location: { latitude: number; longitude: number };
      radius_km: number;
      total_found: number;
      results: ResourceItem[];
    }>(`/geospatial/nearby?${query}`);
  },

  getDistrictStats: () => request<{ districts: any[] }>('/geospatial/districts'),

  // Emergencies
  reportEmergency: (data: Partial<EmergencyIncident>) =>
    request<{ emergency: EmergencyIncident; message: string }>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEmergencies: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ emergencies: EmergencyIncident[] }>(`/emergencies${query ? `?${query}` : ''}`);
  },

  getEmergencyById: (id: string) => request<{ emergency: EmergencyIncident }>(`/emergencies/${id}`),

  updateEmergencyStatus: (id: string, statusData: { status?: string; priority?: string; triage_notes?: string }) =>
    request<{ emergency: EmergencyIncident; message: string }>(`/emergencies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    }),

  getShelters: () => request<{ shelters: ShelterItem[] }>('/emergencies/shelters/list'),

  addShelter: (data: Partial<ShelterItem>) =>
    request<{ shelter: ShelterItem; message: string }>('/emergencies/shelters/add', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getVolunteers: () => request<{ volunteers: VolunteerItem[] }>('/emergencies/volunteers/list'),

  assignVolunteer: (id: string, assignment: { emergency_id?: string | null; availability_status?: string }) =>
    request<{ volunteer: VolunteerItem; message: string }>(`/emergencies/volunteers/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(assignment),
    }),

  // Allocations
  getAllocations: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ allocations: Allocation[] }>(`/allocations${query ? `?${query}` : ''}`);
  },

  getRecommendations: (emergencyId: string) =>
    request<{ emergency: any; recommendations: Array<ResourceItem & { match_score: number; recommendation_reason: string }> }>(
      `/allocations/recommendations/${emergencyId}`
    ),

  createAllocation: (data: { emergency_id: string; resource_id: string; allocated_quantity: number; notes?: string }) =>
    request<{ allocation: Allocation; message: string }>('/allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAllocationStatus: (id: string, statusData: { status: string; notes?: string }) =>
    request<{ allocation: Allocation; message: string }>(`/allocations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[]; unread_count: number }>('/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'POST',
    }),

  // Analytics
  getAnalyticsOverview: () =>
    request<{
      metrics: PlatformMetrics;
      category_distribution: any[];
      emergencies_by_priority: any[];
      emergencies_by_status: any[];
      district_distribution: any[];
      allocation_breakdown: any[];
      audit_logs: any[];
    }>('/analytics/overview'),
};
