export type UserRole = 'admin' | 'rh_analyst' | 'employee';

export type ViewMode = 'admin' | 'rh' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  workMode: 'office' | 'home_office' | 'hybrid';
  registeredLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
}

// Numeric types matching the API: 1=ENTRY, 2=EXIT
export type TimeRecordType = 1 | 2;

export interface TimeRecord {
  id: string;
  userId: string;
  userName: string;
  type: TimeRecordType;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
  validated: boolean;
  validationError?: string;
}

export interface Request {
  id: string;
  userId: string;
  userName: string;
  type: 'medical_certificate' | 'vacation' | 'time_adjustment';
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  referenceDate: Date;
  requestDate: Date;
  attachmentUrl?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  hoursPerDay: number;
  toleranceMinutes: number;
}
