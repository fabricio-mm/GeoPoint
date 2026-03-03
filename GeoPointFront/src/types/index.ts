// Re-export API enums for convenience
export { 
  UserRole, 
  JobTitle, 
  Department, 
  UserStatus,
  TimeEntryType,
  TimeEntryOrigin,
  RequestType,
  RequestStatus,
  WorkScheduleType,
} from '@/services/api';

export type ViewMode = 'admin' | 'rh' | 'employee';
