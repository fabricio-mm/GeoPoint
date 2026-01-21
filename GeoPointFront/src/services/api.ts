const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7145';

// Types
export type UserRole = 'EMPLOYEE' | 'HR' | 'ADMIN';
export type LocationType = 'OFFICE' | 'HOME';
export type TimeEntryType = 1 | 2;
export type TimeEntryOrigin = 'WEB' | 'MOBILE';
export type RequestType = 'CERTIFICATE' | 'FORGOT_PUNCH' | 'VACATION';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

// Interfaces
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  workScheduleId?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  dailyHoursTarget: number;
  toleranceMinutes: number;
  workDays: number[];
}

export interface WorkScheduleCreate {
  name: string;
  dailyHoursTarget: number;
  toleranceMinutes: number;
  workDays: number[];
}

export interface Location {
  id: string;
  userId?: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  user?: User;
}

export interface LocationCreate {
  userId?: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface TimeEntry {
  id: string;
  userId: string;
  type: TimeEntryType;
  origin: TimeEntryOrigin;
  latitudeRecorded: number;
  longitudeRecorded: number;
  createdAt?: string;
  timestampUtc: string;
}

export interface TimeEntryCreate {
  userId: string;
  type: TimeEntryType;
  origin: TimeEntryOrigin;
  latitude: number;
  longitude: number;
}

export interface Request {
  id: string;
  requesterId: string;
  type: RequestType;
  status: RequestStatus;
  justificationUser: string;
  containsProof: boolean;
  targetDate?: string;
  createdAt?: string;
  requester?: User;
  reviewerId?: string;
}

export interface RequestCreate {
  requesterId: string;
  type: RequestType;
  targetDate?: string;
  justification: string;
  containsProof?: boolean;
}

export interface RequestReview {
  reviewerId: string;
  newStatus: 'APPROVED' | 'REJECTED';
}

export interface Attachment {
  id: string;
  requestId: string;
  fileUrl: string;
  fileType: string;
}

export interface DailyBalance {
  id: string;
  userId: string;
  referenceDate: string;
  balanceMinutes: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  timestampUtc: string;
  action: string;
  entityAffected: string;
}

export interface AuditLogFilters {
  userId?: string;
  entity?: string;
}

// API Helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

// ==================== USERS ====================

export const usersApi = {
  getAll: (): Promise<User[]> => {
    return apiRequest<User[]>('/api/Users');
  },

  getById: (id: string): Promise<User> => {
    return apiRequest<User>(`/api/Users/${id}`);
  },
};

// ==================== WORK SCHEDULES ====================

export const workSchedulesApi = {
  getAll: (): Promise<WorkSchedule[]> => {
    return apiRequest<WorkSchedule[]>('/api/WorkSchedules');
  },

  create: (data: WorkScheduleCreate): Promise<WorkSchedule> => {
    return apiRequest<WorkSchedule>('/api/WorkSchedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==================== LOCATIONS ====================

export const locationsApi = {
  getAll: (): Promise<Location[]> => {
    return apiRequest<Location[]>('/api/Locations');
  },

  create: (data: LocationCreate): Promise<Location> => {
    return apiRequest<Location>('/api/Locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==================== TIME ENTRIES ====================

export const timeEntriesApi = {
  create: (data: TimeEntryCreate): Promise<TimeEntry> => {
    return apiRequest<TimeEntry>('/api/TimeEntries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getByUser: (userId: string): Promise<TimeEntry[]> => {
    return apiRequest<TimeEntry[]>(`/api/TimeEntries/user/${userId}`);
  },
};

// ==================== REQUESTS ====================

export const requestsApi = {
  create: (data: RequestCreate): Promise<Request> => {
    return apiRequest<Request>('/api/Requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  review: (id: string, data: RequestReview): Promise<Request> => {
    return apiRequest<Request>(`/api/Requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getPending: (): Promise<Request[]> => {
    return apiRequest<Request[]>('/api/Requests/pending');
  },
};

// ==================== ATTACHMENTS ====================

export const attachmentsApi = {
  upload: async (file: File, requestId: string): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requestId', requestId);

    const response = await fetch(`${API_BASE_URL}/api/Attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/api/Attachments/${id}`;
  },
};

// ==================== REPORTS / DAILY BALANCES ====================

export const reportsApi = {
  getBalance: (userId: string): Promise<DailyBalance[]> => {
    return apiRequest<DailyBalance[]>(`/api/Reports/balance/${userId}`);
  },
};

// ==================== AUDIT LOGS ====================

export const auditLogsApi = {
  getAll: (filters?: AuditLogFilters): Promise<AuditLog[]> => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.entity) params.append('entity', filters.entity);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/AuditLogs?${queryString}` : '/api/AuditLogs';
    
    return apiRequest<AuditLog[]>(endpoint);
  },
};

// Export all APIs as a single object for convenience
export const api = {
  users: usersApi,
  workSchedules: workSchedulesApi,
  locations: locationsApi,
  timeEntries: timeEntriesApi,
  requests: requestsApi,
  attachments: attachmentsApi,
  reports: reportsApi,
  auditLogs: auditLogsApi,
};

export default api;
