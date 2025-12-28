import React, { useState, useMemo } from 'react';
import Header from '@/components/Header/Header';
import { mockUsers, mockTimeRecords, mockWorkSchedules, mockRequests } from '@/data/mockData';
import { User, Clock, Calendar, CheckCircle, AlertCircle, XCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import './AdminDashboard.css';

type TabType = 'apontamentos' | 'usuarios' | 'jornadas';
type PeriodFilter = 'day' | 'week' | 'month';

const typeLabels: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  break_start: 'Início Intervalo',
  break_end: 'Fim Intervalo',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  rh_analyst: 'RH Analyst',
  employee: 'Funcionário',
};

const workModeLabels: Record<string, string> = {
  office: 'Presencial',
  home_office: 'Home Office',
  hybrid: 'Híbrido',
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

  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter(u => u.role !== 'admin').length;
  const totalRecords = mockTimeRecords.length;
  const todayRecords = mockTimeRecords.filter(r => {
    const today = new Date();
    return r.timestamp.toDateString() === today.toDateString();
  }).length;

  // Group records by day and user
  const consolidatedRecords = useMemo(() => {
    const recordsMap = new Map<string, DayRecord>();
    
    mockTimeRecords.forEach(record => {
      const dateStr = record.timestamp.toDateString();
      const key = `${record.userId}-${dateStr}`;
      
      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          date: new Date(record.timestamp.toDateString()),
          dateString: dateStr,
          userId: record.userId,
          userName: record.userName,
          workedHours: 0,
          requiredHours: 8,
          status: 'pending',
          hasError: false,
        });
      }
      
      const dayRecord = recordsMap.get(key)!;
      
      switch (record.type) {
        case 'entry':
          dayRecord.entry = record.timestamp;
          break;
        case 'break_start':
          dayRecord.breakStart = record.timestamp;
          break;
        case 'break_end':
          dayRecord.breakEnd = record.timestamp;
          break;
        case 'exit':
          dayRecord.exit = record.timestamp;
          break;
      }
      
      if (!record.validated) {
        dayRecord.hasError = true;
      }
    });

    // Calculate worked hours and status
    recordsMap.forEach((dayRecord, key) => {
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

      // Check for justifications
      const justification = mockRequests.find(req => 
        req.userId === dayRecord.userId && 
        req.referenceDate.toDateString() === dayRecord.dateString
      );
      
      if (justification) {
        dayRecord.justification = {
          type: justification.type,
          status: justification.status,
          description: justification.description,
        };
        if (justification.status === 'approved') {
          dayRecord.status = 'justified';
        }
      }
    });

    return Array.from(recordsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, []);

  // Get records for a specific date
  const getRecordsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return consolidatedRecords.filter(record => {
      const matchesUser = selectedUser === 'all' || record.userId === selectedUser;
      const matchesSearch = record.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return record.dateString === dateStr && matchesUser && matchesSearch;
    });
  };

  // Get status for a date (for calendar display)
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

  // Generate week days
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

  // Generate month days
  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    // Add empty days for the start of the week
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Filter records for day view
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
                <div className="stat-card-value">{totalUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Usuários Ativos</div>
                <div className="stat-card-value">{activeUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Total de Registros</div>
                <div className="stat-card-value">{totalRecords}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">Registros Hoje</div>
                <div className="stat-card-value">{todayRecords}</div>
              </div>
            </div>

            <div className="records-card">
              <div className="records-header">
                <h2 className="records-title">Apontamentos por Dia</h2>
                <div className="records-filters">
                  {/* Period Filter */}
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
                  
                  {/* Date Navigation */}
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
                    {mockUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                    {WEEKDAYS.map(day => (
                      <div key={day} className="month-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="month-grid">
                    {getMonthDays().map((day, index) => {
                      if (!day) {
                        return <div key={index} className="month-day empty" />;
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
                              <span className="record-count">{dayRecords.length}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="month-legend">
                    <div className="legend-item"><span className="legend-dot complete"></span> Completo</div>
                    <div className="legend-item"><span className="legend-dot incomplete"></span> Horas Faltantes</div>
                    <div className="legend-item"><span className="legend-dot pending"></span> Pendente</div>
                  </div>
                </div>
              )}

              {/* Day View (default or when a day is selected from week/month) */}
              {(periodFilter === 'day' || selectedCalendarDate) && (
                <>
                  {selectedCalendarDate && (
                    <div className="selected-day-header">
                      <button 
                        className="back-to-calendar"
                        onClick={() => setSelectedCalendarDate(null)}
                      >
                        <ChevronLeft size={16} />
                        <span>Voltar para {periodFilter === 'week' ? 'semana' : 'mês'}</span>
                      </button>
                      <h3>{formatDate(selectedCalendarDate)}</h3>
                    </div>
                  )}

                  {filteredRecords.length === 0 ? (
                    <div className="records-empty">
                      <Calendar size={48} className="empty-icon" />
                      <p>Nenhum registro encontrado para esta data</p>
                    </div>
                  ) : (
                    <div className="day-records-grid">
                      {filteredRecords.map((record) => {
                        const statusInfo = getStatusInfo(record);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <div 
                            key={`${record.userId}-${record.dateString}`}
                            className={`day-record-card ${selectedDayRecord?.userId === record.userId && selectedDayRecord?.dateString === record.dateString ? 'selected' : ''} ${record.hasError ? 'has-error' : ''}`}
                            onClick={() => setSelectedDayRecord(record)}
                          >
                            <div className="day-record-header">
                              <div className="day-record-user">
                                <User size={18} />
                                <span>{record.userName}</span>
                              </div>
                              <div className={`day-record-status ${statusInfo.className}`}>
                                <StatusIcon size={14} />
                                <span>{statusInfo.label}</span>
                              </div>
                            </div>
                            
                            <div className="day-record-times">
                              <div className="time-slot">
                                <span className="time-label">Entrada</span>
                                <span className="time-value">{formatTime(record.entry)}</span>
                              </div>
                              <div className="time-slot">
                                <span className="time-label">Intervalo</span>
                                <span className="time-value">
                                  {formatTime(record.breakStart)} - {formatTime(record.breakEnd)}
                                </span>
                              </div>
                              <div className="time-slot">
                                <span className="time-label">Saída</span>
                                <span className="time-value">{formatTime(record.exit)}</span>
                              </div>
                            </div>
                            
                            <div className="day-record-summary">
                              <div className="hours-worked">
                                <Clock size={14} />
                                <span>{record.workedHours.toFixed(1)}h / {record.requiredHours}h</span>
                              </div>
                              {record.justification && (
                                <div className={`justification-badge ${record.justification.status}`}>
                                  <FileText size={12} />
                                  <span>
                                    {record.justification.type === 'medical_certificate' && 'Atestado'}
                                    {record.justification.type === 'vacation' && 'Férias'}
                                    {record.justification.type === 'time_adjustment' && 'Ajuste'}
                                    {' - '}
                                    {record.justification.status === 'approved' && 'Aprovado'}
                                    {record.justification.status === 'pending' && 'Pendente'}
                                    {record.justification.status === 'rejected' && 'Rejeitado'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Detail Panel */}
              {selectedDayRecord && (
                <div className="day-detail-panel">
                  <div className="detail-panel-header">
                    <h3>Detalhes do Ponto</h3>
                    <button 
                      className="close-detail-btn"
                      onClick={() => setSelectedDayRecord(null)}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                  
                  <div className="detail-panel-content">
                    <div className="detail-info">
                      <User size={18} />
                      <div>
                        <strong>{selectedDayRecord.userName}</strong>
                        <span>{formatDate(selectedDayRecord.date)}</span>
                      </div>
                    </div>
                    
                    <div className="detail-times-grid">
                      <div className="detail-time-card">
                        <span className="detail-time-label">Entrada</span>
                        <span className="detail-time-value">{formatTime(selectedDayRecord.entry)}</span>
                      </div>
                      <div className="detail-time-card">
                        <span className="detail-time-label">Início Intervalo</span>
                        <span className="detail-time-value">{formatTime(selectedDayRecord.breakStart)}</span>
                      </div>
                      <div className="detail-time-card">
                        <span className="detail-time-label">Fim Intervalo</span>
                        <span className="detail-time-value">{formatTime(selectedDayRecord.breakEnd)}</span>
                      </div>
                      <div className="detail-time-card">
                        <span className="detail-time-label">Saída</span>
                        <span className="detail-time-value">{formatTime(selectedDayRecord.exit)}</span>
                      </div>
                    </div>
                    
                    <div className="detail-summary">
                      <div className="summary-row">
                        <span>Horas Trabalhadas</span>
                        <strong>{selectedDayRecord.workedHours.toFixed(2)}h</strong>
                      </div>
                      <div className="summary-row">
                        <span>Horas Requeridas</span>
                        <strong>{selectedDayRecord.requiredHours}h</strong>
                      </div>
                      <div className="summary-row">
                        <span>Diferença</span>
                        <strong className={selectedDayRecord.workedHours >= selectedDayRecord.requiredHours ? 'positive' : 'negative'}>
                          {(selectedDayRecord.workedHours - selectedDayRecord.requiredHours).toFixed(2)}h
                        </strong>
                      </div>
                    </div>
                    
                    {selectedDayRecord.justification && (
                      <div className="detail-justification">
                        <h4>Justificativa</h4>
                        <div className={`justification-detail ${selectedDayRecord.justification.status}`}>
                          <div className="justification-type">
                            <FileText size={16} />
                            <span>
                              {selectedDayRecord.justification.type === 'medical_certificate' && 'Atestado Médico'}
                              {selectedDayRecord.justification.type === 'vacation' && 'Férias'}
                              {selectedDayRecord.justification.type === 'time_adjustment' && 'Ajuste de Horário'}
                            </span>
                          </div>
                          <p>{selectedDayRecord.justification.description}</p>
                          <span className={`justification-status ${selectedDayRecord.justification.status}`}>
                            {selectedDayRecord.justification.status === 'approved' && 'Aprovado pelo RH'}
                            {selectedDayRecord.justification.status === 'pending' && 'Aguardando Aprovação'}
                            {selectedDayRecord.justification.status === 'rejected' && 'Rejeitado pelo RH'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {selectedDayRecord.hasError && !selectedDayRecord.justification && (
                      <div className="detail-error">
                        <AlertCircle size={16} />
                        <span>Este registro possui inconsistências não justificadas</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'usuarios' && (
          <div className="users-card">
            <h2 className="users-title">Usuários do Sistema</h2>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Departamento</th>
                  <th>Perfil</th>
                  <th>Modo de Trabalho</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.department}</td>
                    <td>
                      <span className="user-role-badge">{roleLabels[user.role]}</span>
                    </td>
                    <td>
                      <span className="user-workmode-badge">{workModeLabels[user.workMode]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            
            <div className="schedules-grid">
              {mockWorkSchedules.map((schedule, index) => (
                <div 
                  key={schedule.id} 
                  className="schedule-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="schedule-card-header">
                    <div className="schedule-card-icon">
                      <Calendar size={20} />
                    </div>
                    <span className="schedule-badge">{schedule.hoursPerDay}h</span>
                  </div>
                  
                  <h3 className="schedule-card-name">{schedule.name}</h3>
                  
                  <div className="schedule-card-details">
                    <div className="schedule-detail">
                      <Clock size={14} />
                      <span>{schedule.hoursPerDay} horas por dia</span>
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
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
