import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '@/components/Header/Header';
import {
  usersApi,
  workSchedulesApi,
  timeEntriesApi,
  User as ApiUser,
  WorkSchedule as ApiWorkSchedule,
  TimeEntry,
  UserRole,
  UserStatus,
  parseHoursTarget
} from '@/services/api';
import { User, Clock, Calendar, CheckCircle, AlertCircle, XCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import './AdminDashboard.css';

type TabType = 'apontamentos' | 'usuarios' | 'jornadas';
type PeriodFilter = 'day' | 'week' | 'month';

const ENTRY = 1;
const EXIT = 2;

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  HR: 'Analista RH',
  EMPLOYEE: 'Funcionário',
};

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

interface DayRecord {
  date: Date;
  dateString: string;
  userId: string;
  userName: string;
  entry?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  exit?: Date;
  workedHours: number;
  requiredHours: number;
  status: 'complete' | 'incomplete' | 'justified' | 'pending';
  hasError: boolean;
  justification?: {
    type: string;
    status: string;
    description: string;
  };
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('apontamentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('day');
  const [selectedDayRecord, setSelectedDayRecord] = useState<DayRecord | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [workSchedules, setWorkSchedules] = useState<ApiWorkSchedule[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, schedulesData] = await Promise.all([
        usersApi.getAll(),
        workSchedulesApi.getAll(),
      ]);
      setUsers(usersData);
      setWorkSchedules(schedulesData);

      const allEntries: TimeEntry[] = [];
      for (const user of usersData) {
        try {
          const entries = await timeEntriesApi.getByUser(user.id);
          allEntries.push(...entries);
        } catch (err) {
          console.error(`Error loading entries for user ${user.id}:`, err);
        }
      }
      setTimeEntries(allEntries);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar dados');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const totalRecords = timeEntries.length;
  const todayRecords = timeEntries.filter(r => {
    const today = new Date();
    const recordDate = r.timestampUtc ? new Date(r.timestampUtc) : new Date();
    return recordDate.toDateString() === today.toDateString();
  }).length;

  const consolidatedRecords = useMemo(() => {
    const recordsMap = new Map<string, DayRecord>();
    const usersMap = new Map(users.map(u => [u.id, u]));

    timeEntries.forEach(record => {
      const timestamp = new Date(record.timestampUtc);
      const dateStr = timestamp.toDateString();
      const key = `${record.userId}-${dateStr}`;
      const user = usersMap.get(record.userId);

      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          date: new Date(timestamp.toDateString()),
          dateString: dateStr,
          userId: record.userId,
          userName: user?.fullName || 'Usuário',
          workedHours: 0,
          requiredHours: 8,
          status: 'pending',
          hasError: false,
        });
      }

      const dayRecord = recordsMap.get(key)!;

      if (record.type === ENTRY) {
        if (!dayRecord.entry) {
          dayRecord.entry = timestamp;
        } else if (!dayRecord.breakEnd) {
          dayRecord.breakEnd = timestamp;
        }
      } else if (record.type === EXIT) {
        if (!dayRecord.breakStart && dayRecord.entry) {
          dayRecord.breakStart = timestamp;
        } else {
          dayRecord.exit = timestamp;
        }
      }
    });

    recordsMap.forEach((dayRecord) => {
      if (dayRecord.entry && dayRecord.exit) {
        const entryTime = dayRecord.entry.getTime();
        const exitTime = dayRecord.exit.getTime();
        let breakTime = 0;

        if (dayRecord.breakStart && dayRecord.breakEnd) {
          breakTime = dayRecord.breakEnd.getTime() - dayRecord.breakStart.getTime();
        }

        dayRecord.workedHours = (exitTime - entryTime - breakTime) / (1000 * 60 * 60);

        if (dayRecord.workedHours >= dayRecord.requiredHours - 0.25) {
          dayRecord.status = 'complete';
        } else {
          dayRecord.status = 'incomplete';
        }
      } else {
        const today = new Date();
        if (dayRecord.date.toDateString() === today.toDateString()) {
          dayRecord.status = 'pending';
        } else {
          dayRecord.status = 'incomplete';
        }
      }
    });

    return Array.from(recordsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [timeEntries, users]);

  const getRecordsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return consolidatedRecords.filter(record => {
      const matchesUser = selectedUser === 'all' || record.userId === selectedUser;
      const matchesSearch = record.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return record.dateString === dateStr && matchesUser && matchesSearch;
    });
  };

  const getDateStatus = (date: Date): 'complete' | 'incomplete' | 'pending' | 'empty' | 'future' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > today) return 'future';

    const records = getRecordsForDate(date);
    if (records.length === 0) return 'empty';

    const hasIncomplete = records.some(r => r.status === 'incomplete');
    const hasPending = records.some(r => r.status === 'pending');

    if (hasIncomplete) return 'incomplete';
    if (hasPending) return 'pending';
    return 'complete';
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const filteredRecords = useMemo(() => {
    const displayDate = selectedCalendarDate || selectedDate;
    return getRecordsForDate(displayDate);
  }, [consolidatedRecords, searchTerm, selectedUser, selectedDate, selectedCalendarDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (periodFilter === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (periodFilter === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
    setSelectedCalendarDate(null);
    setSelectedDayRecord(null);
  };

  const getStatusInfo = (record: DayRecord) => {
    if (record.status === 'complete') {
      return { label: 'Completo', icon: CheckCircle, className: 'status-complete' };
    }
    if (record.status === 'justified') {
      return { label: 'Justificado', icon: FileText, className: 'status-justified' };
    }
    if (record.status === 'pending') {
      return { label: 'Pendente', icon: Clock, className: 'status-pending' };
    }
    return { label: 'Horas Faltantes', icon: AlertCircle, className: 'status-incomplete' };
  };

  const handleDayClick = (date: Date) => {
    setSelectedCalendarDate(date);
    setSelectedDayRecord(null);
  };

  const getPeriodLabel = () => {
    if (periodFilter === 'day') {
      const displayDate = selectedCalendarDate || selectedDate;
      return formatDate(displayDate);
    }
    if (periodFilter === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const end = weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${start} - ${end}`;
    }
    return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const tabs = [
    { id: 'apontamentos' as TabType, label: 'Todos os apontamentos' },
    { id: 'usuarios' as TabType, label: 'Usuários' },
    { id: 'jornadas' as TabType, label: 'Jornadas de trabalho' },
  ];

  return (
    <div className="admin-dashboard">
      <Header />
      <main className="admin-content">
        <div className="admin-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab ${activeTab === tab.id ? '' : 'secondary'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'apontamentos' && (
          <>
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-card-title">Total de Usuários</div>
                <div className="stat-card-value">{isLoading ? '...' : totalUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Usuários Ativos</div>
                <div className="stat-card-value">{isLoading ? '...' : activeUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Total de Registros</div>
                <div className="stat-card-value">{isLoading ? '...' : totalRecords}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Registros Hoje</div>
                <div className="stat-card-value">{isLoading ? '...' : todayRecords}</div>
              </div>
            </div>

            <div className="records-card">
              <div className="records-header">
                <h2 className="records-title">Apontamentos por Dia</h2>
                <div className="records-filters">
                  <div className="period-filter">
                    <button
                      className={`period-filter-btn ${periodFilter === 'day' ? 'active' : ''}`}
                      onClick={() => { setPeriodFilter('day'); setSelectedCalendarDate(null); }}
                    >
                      Dia
                    </button>
                    <button
                      className={`period-filter-btn ${periodFilter === 'week' ? 'active' : ''}`}
                      onClick={() => { setPeriodFilter('week'); setSelectedCalendarDate(null); }}
                    >
                      Semana
                    </button>
                    <button
                      className={`period-filter-btn ${periodFilter === 'month' ? 'active' : ''}`}
                      onClick={() => { setPeriodFilter('month'); setSelectedCalendarDate(null); }}
                    >
                      Mês
                    </button>
                  </div>

                  <div className="date-navigator">
                    <button className="date-nav-btn" onClick={() => navigatePeriod('prev')}>
                      <ChevronLeft size={20} />
                    </button>
                    <div className="date-display">
                      <Calendar size={16} />
                      <span className="date-label">{getPeriodLabel()}</span>
                    </div>
                    <button className="date-nav-btn" onClick={() => navigatePeriod('next')}>
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <input
                    type="text"
                    className="records-search"
                    placeholder="Buscar por nome"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="records-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="all">Todos os Usuários</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="records-empty">
                  <Clock size={48} className="empty-icon" />
                  <p>Carregando...</p>
                </div>
              ) : (
                <>
                  {/* Week View */}
                  {periodFilter === 'week' && !selectedCalendarDate && (
                    <div className="admin-week-view">
                      <div className="week-grid">
                        {getWeekDays().map((day, index) => {
                          const status = getDateStatus(day);
                          const isToday = day.toDateString() === new Date().toDateString();
                          const dayRecords = getRecordsForDate(day);

                          return (
                            <div
                              key={index}
                              className={`week-day-card ${status} ${isToday ? 'today' : ''}`}
                              onClick={() => handleDayClick(day)}
                            >
                              <div className="week-day-header">
                                <span className="week-day-name">{WEEKDAYS_FULL[index]}</span>
                                <span className="week-day-date">{day.getDate()}/{day.getMonth() + 1}</span>
                              </div>
                              <div className="week-day-content">
                                {dayRecords.length > 0 ? (
                                  <div className="week-day-users">
                                    {dayRecords.slice(0, 3).map((record, idx) => (
                                      <div key={idx} className={`week-user-pill ${record.status}`}>
                                        <User size={12} />
                                        <span>{record.userName.split(' ')[0]}</span>
                                      </div>
                                    ))}
                                    {dayRecords.length > 3 && (
                                      <span className="more-users">+{dayRecords.length - 3}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="no-records">Sem registros</span>
                                )}
                              </div>
                              {status === 'incomplete' && (
                                <div className="week-day-alert">
                                  <AlertCircle size={14} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Month View */}
                  {periodFilter === 'month' && !selectedCalendarDate && (
                    <div className="admin-month-view">
                      <div className="month-header">
                        {WEEKDAYS.map((day, index) => (
                          <div key={index} className="month-weekday">{day}</div>
                        ))}
                      </div>
                      <div className="month-grid">
                        {getMonthDays().map((day, index) => {
                          if (!day) {
                            return <div key={index} className="month-day empty"></div>;
                          }

                          const status = getDateStatus(day);
                          const isToday = day.toDateString() === new Date().toDateString();
                          const dayRecords = getRecordsForDate(day);

                          return (
                            <div
                              key={index}
                              className={`month-day ${status} ${isToday ? 'today' : ''}`}
                              onClick={() => handleDayClick(day)}
                            >
                              <span className="month-day-number">{day.getDate()}</span>
                              {dayRecords.length > 0 && (
                                <div className="month-day-indicator">
                                  <span className="month-day-count">{dayRecords.length}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Day View */}
                  {(periodFilter === 'day' || selectedCalendarDate) && (
                    <div className="admin-day-view">
                      {selectedCalendarDate && (
                        <button
                          className="back-to-calendar"
                          onClick={() => setSelectedCalendarDate(null)}
                        >
                          ← Voltar para {periodFilter === 'week' ? 'semana' : 'mês'}
                        </button>
                      )}

                      {filteredRecords.length === 0 ? (
                        <div className="records-empty">
                          <Clock size={48} className="empty-icon" />
                          <p>Nenhum registro encontrado para este dia</p>
                        </div>
                      ) : (
                        <div className="day-records-container">
                          <div className="day-records-list">
                            {filteredRecords.map((record, index) => {
                              const statusInfo = getStatusInfo(record);
                              const StatusIcon = statusInfo.icon;

                              return (
                                <div
                                  key={`${record.userId}-${record.dateString}`}
                                  className={`day-record-card ${selectedDayRecord?.userId === record.userId && selectedDayRecord?.dateString === record.dateString ? 'selected' : ''}`}
                                  onClick={() => setSelectedDayRecord(record)}
                                  style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                  <div className="day-record-avatar">
                                    <User size={20} />
                                  </div>
                                  <div className="day-record-info">
                                    <span className="day-record-name">{record.userName}</span>
                                    <span className="day-record-hours">
                                      {record.workedHours.toFixed(1)}h / {record.requiredHours}h
                                    </span>
                                  </div>
                                  <div className={`day-record-status ${statusInfo.className}`}>
                                    <StatusIcon size={16} />
                                    <span>{statusInfo.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {selectedDayRecord && (
                            <div className="day-record-detail">
                              <div className="detail-header">
                                <div className="detail-user">
                                  <div className="detail-avatar">
                                    <User size={24} />
                                  </div>
                                  <div className="detail-user-info">
                                    <h3>{selectedDayRecord.userName}</h3>
                                    <span>{formatDate(selectedDayRecord.date)}</span>
                                  </div>
                                </div>
                                <button
                                  className="detail-close"
                                  onClick={() => setSelectedDayRecord(null)}
                                >
                                  ×
                                </button>
                              </div>

                              <div className="detail-times">
                                <div className="detail-time-item">
                                  <span className="detail-time-label">Entrada</span>
                                  <span className="detail-time-value">{formatTime(selectedDayRecord.entry)}</span>
                                </div>
                                <div className="detail-time-item">
                                  <span className="detail-time-label">Início Intervalo</span>
                                  <span className="detail-time-value">{formatTime(selectedDayRecord.breakStart)}</span>
                                </div>
                                <div className="detail-time-item">
                                  <span className="detail-time-label">Fim Intervalo</span>
                                  <span className="detail-time-value">{formatTime(selectedDayRecord.breakEnd)}</span>
                                </div>
                                <div className="detail-time-item">
                                  <span className="detail-time-label">Saída</span>
                                  <span className="detail-time-value">{formatTime(selectedDayRecord.exit)}</span>
                                </div>
                              </div>

                              <div className="detail-summary">
                                <div className="detail-summary-item">
                                  <Clock size={16} />
                                  <span>Horas trabalhadas: <strong>{selectedDayRecord.workedHours.toFixed(1)}h</strong></span>
                                </div>
                                <div className="detail-summary-item">
                                  <Calendar size={16} />
                                  <span>Jornada: <strong>{selectedDayRecord.requiredHours}h</strong></span>
                                </div>
                              </div>

                              {selectedDayRecord.justification && (
                                <div className="detail-justification">
                                  <FileText size={16} />
                                  <div className="justification-content">
                                    <span className="justification-type">{selectedDayRecord.justification.type}</span>
                                    <span className="justification-desc">{selectedDayRecord.justification.description}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'usuarios' && (
          <div className="users-section">
            <h2 className="users-title">Usuários do Sistema</h2>
            {isLoading ? (
              <div className="records-empty">Carregando...</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Perfil</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="user-role-badge">{roleLabels[user.role] || 'Usuário'}</span>
                      </td>
                      <td>
                        <span className={`user-status-badge ${user.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {statusLabels[user.status] || 'Ativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'jornadas' && (
          <div className="schedules-section">
            <div className="schedules-header">
              <div className="schedules-icon">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="schedules-title">Jornadas de Trabalho</h2>
                <p className="schedules-subtitle">Configurações de horários e tolerâncias</p>
              </div>
            </div>

            {isLoading ? (
              <div className="records-empty">Carregando...</div>
            ) : (
              <div className="schedules-grid">
                {workSchedules.map((schedule, index) => {
                  const hoursTarget = parseHoursTarget(schedule.dailyHoursTarget);

                  return (
                    <div
                      key={schedule.id}
                      className="schedule-card"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="schedule-card-header">
                        <div className="schedule-card-icon">
                          <Calendar size={20} />
                        </div>
                        <span className="schedule-badge">{hoursTarget}h</span>
                      </div>

                      <h3 className="schedule-card-name">{schedule.name}</h3>

                      <div className="schedule-card-details">
                        <div className="schedule-detail">
                          <Clock size={14} />
                          <span>{hoursTarget} horas por dia</span>
                        </div>
                        <div className="schedule-detail">
                          <AlertCircle size={14} />
                          <span>Tolerância: {schedule.toleranceMinutes} minutos</span>
                        </div>
                      </div>

                      <div className="schedule-card-footer">
                        <span className="schedule-status active">Ativo</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
