import { User, TimeRecord, Request, WorkSchedule } from '@/types';

export const mockUsers: User[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'João Silva',
    email: 'admin@geopoint.com',
    role: 'admin',
    department: 'TI',
    workMode: 'office',
    registeredLocation: { lat: -23.5505, lng: -46.6333, address: 'Av. Paulista, 1000 - São Paulo' }
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Maria Santos',
    email: 'rh@geopoint.com',
    role: 'rh_analyst',
    department: 'Recursos Humanos',
    workMode: 'hybrid',
    registeredLocation: { lat: -23.5505, lng: -46.6333, address: 'Av. Paulista, 1000 - São Paulo' }
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Carlos Oliveira',
    email: 'user@geopoint.com',
    role: 'employee',
    department: 'Desenvolvimento',
    workMode: 'home_office',
    registeredLocation: { lat: -23.5489, lng: -46.6388, address: 'Rua Augusta, 500 - São Paulo' }
  }
];

export const mockTimeRecords: TimeRecord[] = [
  // Hoje - 28/12
  {
    id: '1',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-28T08:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '2',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-28T12:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  // Ontem - 27/12
  {
    id: '3',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-27T08:05:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '4',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-27T12:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '5',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-27T13:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '6',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-27T17:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  // 26/12 -  não justificado
  {
    id: '7',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-26T10:30:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: false
  },
  {
    id: '8',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-26T15:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  // 24/12 - Dia OK
  {
    id: '9',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-24T08:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '10',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-24T17:00:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  // 23/12 - Dia OK
  {
    id: '11',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-23T08:10:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  {
    id: '12',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 2,
    timestamp: new Date('2025-12-23T17:05:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: true
  },
  // 22/12 - Problema não justificado
  {
    id: '13',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 1,
    timestamp: new Date('2025-12-22T09:45:00'),
    location: { lat: -23.5489, lng: -46.6388 },
    validated: false
  }

];

export const mockRequests: Request[] = [
  {
    id: '1',
    userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userName: 'Carlos Oliveira',
    type: 'medical_certificate',
    status: 'pending',
    description: 'Atestado Teste',
    referenceDate: new Date('2025-12-11'),
    requestDate: new Date('2025-12-13'),
  }
];

export const mockWorkSchedules: WorkSchedule[] = [
  { id: '1', name: 'Horário Comercial (8h)', hoursPerDay: 8, toleranceMinutes: 15 },
  { id: '2', name: 'Meio Período (4h)', hoursPerDay: 4, toleranceMinutes: 10 },
  { id: '3', name: 'Escala 12x36', hoursPerDay: 12, toleranceMinutes: 15 },
];

export const loginCredentials = {
  'admin@geopoint.com': { password: 'admin123', userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  'rh@geopoint.com': { password: 'rh123', userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
  'user@geopoint.com': { password: 'user123', userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
};
