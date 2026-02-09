import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, History, List, MapPin, Check, Briefcase, Timer, AlertCircle, CalendarDays, FileText, CheckCircle2, XCircle, Plus, LogIn, LogOut, Coffee, UtensilsCrossed } from 'lucide-react';
import Header from '@/components/Header/Header';
import HistoryCalendar from '@/components/HistoryCalendar/HistoryCalendar';
import NewRequestModal, { DisplayRequest } from '@/components/NewRequestModal/NewRequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { TimeRecord, TimeRecordType } from '@/types';
import {
  timeEntriesApi,
  requestsApi,
  workSchedulesApi,
  TimeEntry,
  RequestType,
  RequestStatus,
  WorkSchedule,
  parseHoursTarget
} from '@/services/api';
import { toast } from 'sonner';
import './EmployeeDashboard.css';

type TabType = 'ponto' | 'historico' | 'solicitacoes';
type PeriodFilter = 'day' | 'week' | 'month';

const ENTRY: TimeRecordType = 1;
const EXIT: TimeRecordType = 2;

// UI clock step — the 4-step daily flow
type ClockStep = 'entry' | 'break_start' | 'break_end' | 'exit';

const stepLabels: Record<ClockStep, string> = {
  entry: 'Entrada',
  break_start: 'Início Intervalo',
  break_end: 'Fim Intervalo',
  exit: 'Saída',
};

const stepToApiType = (step: ClockStep): TimeRecordType =>
  (step === 'entry' || step === 'break_end') ? ENTRY : EXIT;

/** Derive a display label from a TimeRecord based on its position in the day */
const getRecordLabel = (record: TimeRecord, dayRecords: TimeRecord[]): string => {
  const sorted = [...dayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const index = sorted.findIndex(r => r.id === record.id);
  const labels = ['Entrada', 'Início Intervalo', 'Fim Intervalo', 'Saída'];
  if (index >= 0 && index < labels.length) return labels[index];
  return record.type === ENTRY ? 'Entrada' : 'Saída';
};

const requestTypeLabels: Record<RequestType, string> = {
  1: 'Esquecimento de Ponto',
  2: 'Atestado Médico',
  3: 'Férias',
};

const statusLabels: Record<RequestStatus, string> = {
  0: 'Pendente',
  1: 'Aprovado',
  2: 'Rejeitado',
};

const statusCssClass = (status: RequestStatus): string => {
  return ['pending', 'approved', 'rejected'][status] || 'pending';
};

const mapTimeEntryToRecord = (entry: TimeEntry, userName: string): TimeRecord => ({
  id: entry.id,
  userId: entry.userId,
  userName,
  type: entry.type,
  timestamp: entry.timestampUtc ? new Date(entry.timestampUtc) : new Date(),
  location: { lat: entry.latitudeRecorded, lng: entry.longitudeRecorded },
  validated: true,
});

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('ponto');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('day');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return records.filter(record => {
      const recordDate = new Date(record.timestamp);
      switch (periodFilter) {
        case 'day': return recordDate >= startOfDay;
        case 'week': return recordDate >= startOfWeek;
        case 'month': return recordDate >= startOfMonth;
        default: return true;
      }
    });
  }, [records, periodFilter]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const entries = await timeEntriesApi.getByUser(user.id);
      setRecords(entries.map(e => mapTimeEntryToRecord(e, user.name)));
    } catch (e) {
      console.error(e);
    }

    try {
      const schedules = await workSchedulesApi.getAll();
      if (schedules.length > 0) setSchedule(schedules[0]);
    } catch (e) {
      console.error(e);
    }

    try {
      // Try user-specific endpoint first, fallback to filtering pending
      let userRequests: typeof requests = [];
      try {
        const allUserReqs = await requestsApi.getByUser(user.id);
        userRequests = allUserReqs.map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          description: r.justificationUser,
          containsProof: r.containsProof,
          createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
        }));
      } catch {
        // Fallback: filter from pending
        const pending = await requestsApi.getPending();
        userRequests = pending
          .filter(r => r.requesterId === user.id)
          .map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            description: r.justificationUser,
            containsProof: r.containsProof,
            createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
          }));
      }
      setRequests(userRequests);
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationStatus('success');
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocationStatus('error')
    );
  }, []);

  const getTodayRecords = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return records
      .filter(r => r.timestamp >= start)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  /** Determine the next clock step based on how many punches today */
  const getNextExpectedStep = (): ClockStep | null => {
    const todayCount = getTodayRecords().length;
    const steps: ClockStep[] = ['entry', 'break_start', 'break_end', 'exit'];
    if (todayCount >= steps.length) return null;
    return steps[todayCount];
  };

  const isStepCompleted = (step: ClockStep): boolean => {
    const steps: ClockStep[] = ['entry', 'break_start', 'break_end', 'exit'];
    const stepIndex = steps.indexOf(step);
    return getTodayRecords().length > stepIndex;
  };

  const isStepEnabled = (step: ClockStep): boolean => {
    const steps: ClockStep[] = ['entry', 'break_start', 'break_end', 'exit'];
    const stepIndex = steps.indexOf(step);
    const todayCount = getTodayRecords().length;
    return locationStatus === 'success' && todayCount === stepIndex;
  };

  const handleRegisterTime = async (step: ClockStep) => {
    if (!user || !currentLocation || locationStatus !== 'success') {
      toast.error('Localização inválida');
      return;
    }

    const apiType = stepToApiType(step);

    try {
      await timeEntriesApi.create({
        userId: user.id,
        type: apiType,
        origin: 1, // WEB
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      setRecords(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          type: apiType,
          timestamp: new Date(),
          location: currentLocation,
          validated: true,
        },
      ]);

      toast.success(`${stepLabels[step]} registrada com sucesso`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar ponto');
    }
  };

  const nextExpectedStep = getNextExpectedStep();

  const retryLocation = () => {
    setLocationStatus('checking');
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationStatus('success');
            setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => setLocationStatus('error')
        );
      }
    }, 500);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const formatDateTime = (date: Date) =>
    date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleNewRequest = async (newRequest: DisplayRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    await loadData();
  };

  const scheduleHours = schedule ? parseHoursTarget(schedule.dailyHoursTarget) : 8;
  const scheduleTolerance = schedule?.toleranceMinutes || 15;
  const scheduleName = schedule?.name || 'Horário Comercial';

  const tabs = [
    { id: 'ponto' as TabType, label: 'Ponto', icon: Clock },
    { id: 'historico' as TabType, label: 'Histórico', icon: History },
    { id: 'solicitacoes' as TabType, label: 'Solicitações', icon: List },
  ];

  return (
    <div className="employee-dashboard">
      <Header />
      <main className="employee-content">
        <div className="employee-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`employee-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="employee-tab-icon" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'ponto' && (
          <div className="clock-section">
            <div className="clock-main-card">
              <div className="clock-time-display">
                <div className="clock-time">{formatTime(currentTime)}</div>
                <div className="clock-date">{formatDate(currentTime)}</div>
              </div>

              {locationStatus === 'error' && (
                <div className="clock-location-alert error">
                  <div className="clock-location-alert-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="clock-location-alert-content">
                    <span className="clock-location-alert-title">Localização não encontrada</span>
                    <span className="clock-location-alert-text">Verifique suas permissões de localização</span>
                  </div>
                  <button className="clock-location-retry-btn" onClick={retryLocation}>
                    Tentar novamente
                  </button>
                </div>
              )}

              {locationStatus === 'success' && (
                <div className="clock-location-alert success">
                  <div className="clock-location-alert-icon">
                    <Check size={20} />
                  </div>
                  <div className="clock-location-alert-content">
                    <span className="clock-location-alert-title">Localização validada</span>
                    <span className="clock-location-alert-text">Você está na área permitida</span>
                  </div>
                </div>
              )}

              <div className="clock-action-buttons">
                <button
                  className={`clock-action-button entry ${isStepCompleted('entry') ? 'completed' : nextExpectedStep === 'entry' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('entry')}
                  disabled={!isStepEnabled('entry')}
                >
                  <LogIn size={18} />
                  Entrada
                </button>
                <button
                  className={`clock-action-button break_start ${isStepCompleted('break_start') ? 'completed' : nextExpectedStep === 'break_start' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('break_start')}
                  disabled={!isStepEnabled('break_start')}
                >
                  <UtensilsCrossed size={18} />
                  Início Almoço
                </button>
                <button
                  className={`clock-action-button break_end ${isStepCompleted('break_end') ? 'completed' : nextExpectedStep === 'break_end' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('break_end')}
                  disabled={!isStepEnabled('break_end')}
                >
                  <Coffee size={18} />
                  Fim Almoço
                </button>
                <button
                  className={`clock-action-button exit ${isStepCompleted('exit') ? 'completed' : nextExpectedStep === 'exit' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('exit')}
                  disabled={!isStepEnabled('exit')}
                >
                  <LogOut size={18} />
                  Saída
                </button>
              </div>
            </div>

            <div className="clock-info-cards">
              <div className="clock-info-card schedule">
                <div className="clock-info-card-header">
                  <div className="clock-info-card-icon">
                    <Briefcase size={20} />
                  </div>
                  <h3 className="clock-info-card-title">Sua Jornada</h3>
                </div>
                <div className="clock-info-card-content">
                  <div className="schedule-name">{scheduleName}</div>
                  <div className="schedule-details">
                    <div className="schedule-detail-item">
                      <Timer size={16} />
                      <span>{scheduleHours}h por dia</span>
                    </div>
                    <div className="schedule-detail-item">
                      <AlertCircle size={16} />
                      <span>Tolerância: {scheduleTolerance} min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="clock-info-card warning">
                <div className="clock-info-card-header">
                  <div className="clock-info-card-icon warning">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="clock-info-card-title">Importante</h3>
                </div>
                <p className="clock-info-card-text">
                  O sistema valida sua localização. Caso haja erro de validação, conteste o ponto no
                  histórico e abra uma solicitação ao RH.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="history-section">
            <div className="section-header">
              <h2 className="section-title">Histórico de Registros</h2>
              <div className="period-filter">
                <button
                  className={`period-filter-btn ${periodFilter === 'day' ? 'active' : ''}`}
                  onClick={() => setPeriodFilter('day')}
                >
                  Hoje
                </button>
                <button
                  className={`period-filter-btn ${periodFilter === 'week' ? 'active' : ''}`}
                  onClick={() => setPeriodFilter('week')}
                >
                  Semana
                </button>
                <button
                  className={`period-filter-btn ${periodFilter === 'month' ? 'active' : ''}`}
                  onClick={() => setPeriodFilter('month')}
                >
                  Mês
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <Clock size={48} />
                <span>Carregando...</span>
              </div>
            ) : (
              <>
                {periodFilter === 'day' && (
                  <>
                    {filteredRecords.length === 0 ? (
                      <div className="empty-state">
                        <History size={48} />
                        <span>Nenhum registro encontrado para hoje</span>
                      </div>
                    ) : (
                      <div className="history-list">
                        {filteredRecords.map((record, index) => (
                          <div
                            key={record.id}
                            className="history-card"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <div className="history-card-left">
                              <div className={`history-type-icon type-${record.type}`}>
                                <Clock size={16} />
                              </div>
                            </div>
                            <div className="history-card-content">
                              <span className="history-type-label">{getRecordLabel(record, filteredRecords)}</span>
                              <span className="history-time">{formatDateTime(record.timestamp)}</span>
                            </div>
                            <div className="history-card-right">
                              {!record.validated && (
                                <span className="history-error-badge">
                                  <AlertCircle size={14} />
                                  Erro
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {periodFilter === 'week' && (
                  <HistoryCalendar records={filteredRecords} view="week" />
                )}

                {periodFilter === 'month' && (
                  <HistoryCalendar records={filteredRecords} view="month" />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'solicitacoes' && (
          <div className="requests-section">
            <div className="section-header">
              <h2 className="section-title">Minhas Solicitações</h2>
              <button
                className="new-request-btn"
                onClick={() => setIsNewRequestModalOpen(true)}
              >
                <Plus size={18} />
                Nova Solicitação
              </button>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <Clock size={48} />
                <span>Carregando...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <span>Nenhuma solicitação encontrada</span>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((request, index) => {
                  const status = statusCssClass(request.status);

                  return (
                    <div
                      key={request.id}
                      className="request-card"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="request-card-left">
                        <div className="request-type-icon">
                          <FileText size={16} />
                        </div>
                      </div>
                      <div className="request-card-content">
                        <div className="request-card-header">
                          <span className="request-card-type">
                            {requestTypeLabels[request.type] || 'Solicitação'}
                          </span>
                          <span className={`request-card-badge ${status}`}>
                            {status === 'pending' && <Clock size={12} />}
                            {status === 'approved' && <CheckCircle2 size={12} />}
                            {status === 'rejected' && <XCircle size={12} />}
                            {statusLabels[request.status] || 'Pendente'}
                          </span>
                        </div>
                        <span className="request-card-description">{request.description}</span>
                        {request.createdAt && (
                          <span className="request-card-date">
                            <CalendarDays size={14} />
                            Solicitado em {formatDateTime(request.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <NewRequestModal
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        onSubmit={handleNewRequest}
        userId={user?.id || ''}
      />
    </div>
  );
}
