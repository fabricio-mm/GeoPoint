const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7145';

// ==================== ENUMS ====================

export enum TimeEntryOrigin {
  Web = 1,
  Office = 2,
}

export enum TimeEntryType {
  Entry = 0,
  LaunchTime = 1,
  ReturnToWork = 2,
  Exit = 3,
}

export enum UserRole {
  Intern = 0,
  Employee = 1,
  Trainee = 2,
  Contractor = 3,
}

export enum WorkScheduleType {
  Comercial = 0,
  Intern = 1,
  Contractor = 2,
}

export enum JobTitle {
  SoftwareEngineer = 0,
  Developer = 1,
  TechLead = 2,
  ProductOwner = 3,
  ScrumMaster = 4,
  Architect = 5,
  HrAnalyst = 6,
  Manager = 7,
  DataEngineer = 8,
  Support = 9,
  Director = 10,
}

export enum Department {
  IT = 0,
  HR = 1,
  Finance = 2,
  Marketing = 3,
  Sales = 4,
  Operations = 5,
  Legal = 6,
  Board = 7,
}

export enum UserStatus {
  Inactive = 0,
  Active = 1,
}

export enum RequestType {
  MaternityLeave = 0,
  DoctorsNote = 1,
  ForgotPunch = 2,
  Vacations = 3,
}

export enum RequestStatus {
  Pending = 1,
  Accepted = 2,
  Rejected = 3,
}

// ==================== LABELS ====================

export const userRoleLabels: Record<UserRole, string> = {
  [UserRole.Intern]: 'Estagiário',
  [UserRole.Employee]: 'Funcionário',
  [UserRole.Trainee]: 'Trainee',
  [UserRole.Contractor]: 'Terceirizado',
};

export const jobTitleLabels: Record<JobTitle, string> = {
  [JobTitle.SoftwareEngineer]: 'Engenheiro de Software',
  [JobTitle.Developer]: 'Desenvolvedor',
  [JobTitle.TechLead]: 'Tech Lead',
  [JobTitle.ProductOwner]: 'Product Owner',
  [JobTitle.ScrumMaster]: 'Scrum Master',
  [JobTitle.Architect]: 'Arquiteto',
  [JobTitle.HrAnalyst]: 'Analista de RH',
  [JobTitle.Manager]: 'Gerente',
  [JobTitle.DataEngineer]: 'Engenheiro de Dados',
  [JobTitle.Support]: 'Suporte',
  [JobTitle.Director]: 'Diretor',
};

export const departmentLabels: Record<Department, string> = {
  [Department.IT]: 'Tecnologia',
  [Department.HR]: 'RH',
  [Department.Finance]: 'Financeiro',
  [Department.Marketing]: 'Marketing',
  [Department.Sales]: 'Comercial',
  [Department.Operations]: 'Operações',
  [Department.Legal]: 'Jurídico',
  [Department.Board]: 'Diretoria',
};

export const requestTypeLabels: Record<RequestType, string> = {
  [RequestType.MaternityLeave]: 'Licença Maternidade',
  [RequestType.DoctorsNote]: 'Atestado Médico',
  [RequestType.ForgotPunch]: 'Esquecimento de Ponto',
  [RequestType.Vacations]: 'Férias',
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: 'Pendente',
  [RequestStatus.Accepted]: 'Aprovado',
  [RequestStatus.Rejected]: 'Rejeitado',
};

export const timeEntryTypeLabels: Record<TimeEntryType, string> = {
  [TimeEntryType.Entry]: 'Entrada',
  [TimeEntryType.LaunchTime]: 'Início Intervalo',
  [TimeEntryType.ReturnToWork]: 'Fim Intervalo',
  [TimeEntryType.Exit]: 'Saída',
};

// ==================== INTERFACES ====================

export interface WorkSchedule {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  workDays: number[];
  users?: User[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: Department;
  jobTitle: JobTitle;
  status: UserStatus;
  workScheduleId?: number;
  workSchedule?: WorkSchedule;
  locations?: Location[];
}

export interface UserCreate {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  workScheduleId: number;
  department: Department;
  jobTitle: JobTitle;
}

export enum LocationType {
  Office = 1,
  Home = 2,
}

export const locationTypeLabels: Record<LocationType, string> = {
  [LocationType.Office]: 'Escritório',
  [LocationType.Home]: 'Home Office',
};

export interface Location {
  id: string;
  userId?: string;
  name: string;
  type: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  user?: User;
}

export interface LocationCreate {
  userId?: string;
  name: string;
  type: number;
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

export interface ApiRequest {
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
  targetDate: string;
  justification?: string;
  attachments?: File[];
}

export interface RequestReview {
  reviewerId: string;
  newStatus: RequestStatus.Accepted | RequestStatus.Rejected;
  comment?: string;
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

export interface LoginResponse {
  token: string;
  user: User;
}

// ==================== TOKEN MANAGEMENT ====================

let authToken: string | null = localStorage.getItem('geopoint_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('geopoint_token', token);
  } else {
    localStorage.removeItem('geopoint_token');
  }
};

export const getAuthToken = (): string | null => authToken;

// ==================== API Helper ====================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
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

// ==================== AUTH ====================

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// ==================== USERS ====================

export const usersApi = {
  getAll: (): Promise<User[]> => {
    return apiRequest<User[]>('/api/Users');
  },

  getById: (id: string): Promise<User> => {
    return apiRequest<User>(`/api/Users/${id}`);
  },

  create: (data: UserCreate): Promise<User> => {
    return apiRequest<User>('/api/Users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==================== WORK SCHEDULES ====================

export const workSchedulesApi = {
  getAll: (): Promise<WorkSchedule[]> => {
    return apiRequest<WorkSchedule[]>('/api/WorkSchedules');
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
  create: async (data: RequestCreate): Promise<ApiRequest> => {
    const formData = new FormData();
    formData.append('RequesterId', data.requesterId);
    formData.append('Type', String(data.type));
    formData.append('TargetDate', data.targetDate);
    if (data.justification) formData.append('Justification', data.justification);
    if (data.attachments) {
      data.attachments.forEach(file => formData.append('Attachments', file));
    }

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/api/Requests`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  review: (id: string, data: RequestReview): Promise<ApiRequest> => {
    return apiRequest<ApiRequest>(`/api/Requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getPending: (): Promise<ApiRequest[]> => {
    return apiRequest<ApiRequest[]>('/api/Requests/pending');
  },

  getById: (id: string): Promise<ApiRequest> => {
    return apiRequest<ApiRequest>(`/api/Requests/${id}`);
  },

  getByUser: (userId: string): Promise<ApiRequest[]> => {
    return apiRequest<ApiRequest[]>(`/api/Requests/user/${userId}`);
  },

  update: (id: string, data: { targetDate: string; justification?: string }): Promise<ApiRequest> => {
    return apiRequest<ApiRequest>(`/api/Requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string): Promise<void> => {
    return apiRequest<void>(`/api/Requests/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== ATTACHMENTS ====================

export const attachmentsApi = {
  upload: async (file: File, requestId: string): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('RequestId', requestId);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/Attachments`, {
      method: 'POST',
      headers,
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

// ==================== HELPER FUNCTIONS ====================

/** Check if a JobTitle can review requests (Manager or HrAnalyst) */
export const canReviewRequests = (jobTitle: JobTitle): boolean => {
  return jobTitle === JobTitle.Manager || jobTitle === JobTitle.HrAnalyst;
};

/** Check if user should see the RH/Admin dashboard */
export const getViewForJobTitle = (jobTitle: JobTitle): 'admin' | 'rh' | 'employee' => {
  if (jobTitle === JobTitle.Manager || jobTitle === JobTitle.Director) return 'admin';
  if (jobTitle === JobTitle.HrAnalyst) return 'rh';
  return 'employee';
};

/** Parse time strings like "08:00:00" to hours */
export const parseTimeToHours = (time: string): number => {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
  }
  return 0;
};

/** Calculate daily hours from startTime and endTime (minus 1h lunch) */
export const calcScheduleHours = (schedule: WorkSchedule): number => {
  const start = parseTimeToHours(schedule.startTime);
  const end = parseTimeToHours(schedule.endTime);
  return end - start - 1; // subtract 1h lunch
};

// Export all APIs
export const api = {
  auth: authApi,
  users: usersApi,
  workSchedules: workSchedulesApi,
  locations: locationsApi,
  timeEntries: timeEntriesApi,
  requests: requestsApi,
  attachments: attachmentsApi,
  reports: reportsApi,
};

export default api;
