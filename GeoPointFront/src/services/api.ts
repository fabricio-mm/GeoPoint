const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7145';

// ==================== TYPES ====================

export type UserRole = 'EMPLOYEE' | 'HR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type LocationType = 'OFFICE' | 'HOME';
export type TimeEntryType = 1 | 2;
export type TimeEntryOrigin = 1 | 2; // 1=WEB, 2=MOBILE
export type RequestType = 1 | 2 | 3; // 1=FORGOT_PUNCH, 2=CERTIFICATE, 3=VACATION
export type RequestStatus = 0 | 1 | 2; // 0=PENDING, 1=APPROVED, 2=REJECTED

// ==================== INTERFACES ====================

export interface WorkSchedule {
  id: string;
  name: string;
  dailyHoursTarget: string;
  toleranceMinutes: number;
  workDays: number[];
  users?: User[];
}

export interface WorkScheduleCreate {
  name: string;
  dailyHoursTarget: string;
  toleranceMinutes: number;
  workDays: number[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  workScheduleId?: string;
  workSchedule?: WorkSchedule;
  locations?: Location[];
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
  timestampUtc: string;
  type: TimeEntryType;
  origin: TimeEntryOrigin;
  latitudeRecorded: number;
  longitudeRecorded: number;
  isManualAdjustment?: boolean;
  user?: User;
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
  reviewerId?: string;
  type: RequestType;
  targetDate?: string;
  status: RequestStatus;
  justificationUser: string;
  containsProof: boolean;
  createdAt?: string;
  requester?: User;
  reviewer?: User;
  attachments?: Attachment[];
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
  newStatus: 1 | 2; // 1=APPROVED, 2=REJECTED
}

export interface Attachment {
  id: string;
  requestId: string;
  fileUrl?: string;
  fileType?: string;
}

export interface DailyBalance {
  id: string;
  userId: string;
  referenceDate: string;
  totalWorkedMinutes?: number;
  balanceMinutes: number;
  overtimeMinutes?: number;
  status?: string;
  user?: User;
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

// ==================== API Helper ====================

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

  getById: (id: string): Promise<Request> => {
    return apiRequest<Request>(`/api/Requests/${id}`);
  },

  getByUser: (userId: string): Promise<Request[]> => {
    return apiRequest<Request[]>(`/api/Requests/user/${userId}`);
  },
};

// ==================== ATTACHMENTS ====================

export const attachmentsApi = {
  upload: async (file: File, requestId: string): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('RequestId', requestId);

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

  getAuditLogs: (): Promise<AuditLog[]> => {
    return apiRequest<AuditLog[]>('/api/Reports/audit-logs');
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

// ==================== HELPER FUNCTIONS ====================

// Parse dailyHoursTarget from "HH:MM:SS" to hours number
export const parseHoursTarget = (target: string): number => {
  const parts = target.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours + (minutes / 60);
  }
  return 8;
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
