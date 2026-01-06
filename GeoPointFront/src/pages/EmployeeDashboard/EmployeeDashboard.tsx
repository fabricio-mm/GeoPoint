import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, History, List, MapPin, Check, Briefcase, Timer, AlertCircle, CalendarDays, FileText, CheckCircle2, XCircle, Plus, LogIn, LogOut, Coffee, UtensilsCrossed } from 'lucide-react';
import Header from '@/components/Header/Header';
import HistoryCalendar from '@/components/HistoryCalendar/HistoryCalendar';
import NewRequestModal from '@/components/NewRequestModal/NewRequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { mockWorkSchedules } from '@/data/mockData';
import { TimeRecord } from '@/types';
import { timeEntriesApi, requestsApi, TimeEntry, Request as ApiRequest, TimeEntryType } from '@/services/api';
import { toast } from 'sonner';
import './EmployeeDashboard.css';

type TabType = 'ponto' | 'historico' | 'solicitacoes';
type PeriodFilter = 'day' | 'week' | 'month';

const typeLabels: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  break_start: 'Início Intervalo',
  break_end: 'Fim Intervalo',
  ENTRY: 'Entrada',
  EXIT: 'Saída',
};

const requestTypeLabels: Record<string, string> = {
  medical_certificate: 'Atestado Médico',
  vacation: 'Férias',
  time_adjustment: 'Ajuste de Ponto',
  CERTIFICATE: 'Atestado Médico',
  FORGOT_PUNCH: 'Esquecimento de Ponto',
  VACATION: 'Férias',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

// Map API TimeEntry to local TimeRecord format
const mapTimeEntryToRecord = (entry: TimeEntry, userName: string): TimeRecord => ({
  id: entry.id,
  userId: entry.userId,
  userName,
  type: entry.type === 'ENTRY' ? 'entry' : 'exit',
  timestamp: entry.createdAt ? new Date(entry.createdAt) : new Date(),
  location: { lat: entry.latitudeRecorded, lng: entry.longitudeRecorded },
  validated: true,
});

interface DisplayRequest {
  id: string;
  type: string;
  status: string;
  description: string;
  containsProof?: boolean;
  createdAt?: Date;
}

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
  const schedule = mockWorkSchedules[0];

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return records.filter(record => {
      const recordDate = new Date(record.timestamp);
      switch (periodFilter) {
        case 'day':
          return recordDate >= startOfDay;
        case 'week':
          return recordDate >= startOfWeek;
        case 'month':
          return recordDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [records, periodFilter]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data from API
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load time entries
      const entries = await timeEntriesApi.getByUser(user.id);
      const mappedRecords = entries.map(e => mapTimeEntryToRecord(e, user.name));
      setRecords(mappedRecords);
    } catch (err) {
      console.error('Error loading time entries:', err);
      // Keep empty array if API fails
    }
    

    try {
      // Load requests - using pending endpoint as there's no user-specific endpoint
      const pendingRequests = await requestsApi.getPending();
      const userRequests = pendingRequests
        .filter(r => r.requesterId === user.id)
        .map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          description: r.justificationUser,
          containsProof: r.containsProof,
          createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
        }));
      setRequests(userRequests);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
    
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  console.log('requests', requests)

  useEffect(() => {
    const checkLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationStatus('success');
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => setLocationStatus('error')
        );
      } else {
        setLocationStatus('error');
      }
    };
    checkLocation();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTodayRecords = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return records.filter(r => new Date(r.timestamp) >= startOfDay);
  };

  const getNextExpectedType = (): TimeRecord['type'] | null => {
    const todayRecords = getTodayRecords();
    if (todayRecords.length === 0) return 'entry';
    
    const lastRecord = todayRecords.reduce((latest, record) => 
      new Date(record.timestamp) > new Date(latest.timestamp) ? record : latest
    );
    
    switch (lastRecord.type) {
      case 'entry': return 'break_start';
      case 'break_start': return 'break_end';
      case 'break_end': return 'exit';
      case 'exit': return null;
      default: return 'entry';
    }
  };

  const handleRegisterTime = async (type: TimeRecord['type']) => {
    if (locationStatus !== 'success' || !currentLocation) {
      toast.error('Não é possível registrar ponto sem localização válida');
      return;
    }

    if (!user) return;

    // Map local type to API type
    const apiType: TimeEntryType = type === 'entry' || type === 'break_end' ? 'ENTRY' : 'EXIT';
    
    try {
      await timeEntriesApi.create({
        userId: user.id,
        type: apiType,
        origin: 'WEB',
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      // Create local record for immediate feedback
      const newRecord: TimeRecord = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        type,
        timestamp: new Date(),
        location: currentLocation,
        validated: true,
      };
      
      setRecords(prev => [newRecord, ...prev]);
      toast.success(`${typeLabels[type]} registrada com sucesso!`);
    } catch (err) {
      console.error('Error registering time:', err);
      toast.error('Erro ao registrar ponto. Verifique sua localização.');
    }
  };

  const isTypeRegisteredToday = (type: TimeRecord['type']) => {
    return getTodayRecords().some(r => r.type === type);
  };

  const nextExpectedType = getNextExpectedType();

  const retryLocation = () => {
    setLocationStatus('checking');
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationStatus('success');
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => setLocationStatus('error')
        );
      }
    }, 500);
  };

  const handleNewRequest = async (newRequest: DisplayRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    // Reload data to get fresh list
    await loadData();
  };

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
                    <span className="clock-location-alert-text">
                      Verifique suas permissões de localização
                    </span>
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
                    <span className="clock-location-alert-text">
                      Você está na área permitida
                    </span>
                  </div>
                </div>
              )}

              <div className="clock-action-buttons">
                <button 
                  className={`clock-action-button entry ${isTypeRegisteredToday('entry') ? 'completed' : nextExpectedType === 'entry' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('entry')}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday('entry')}
                >
                  <LogIn size={18} />
                  Entrada
                </button>
                <button 
                  className={`clock-action-button break_start ${isTypeRegisteredToday('break_start') ? 'completed' : nextExpectedType === 'break_start' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('break_start')}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday('break_start') || !isTypeRegisteredToday('entry')}
                >
                  <UtensilsCrossed size={18} />
                  Início Almoço
                </button>
                <button 
                  className={`clock-action-button break_end ${isTypeRegisteredToday('break_end') ? 'completed' : nextExpectedType === 'break_end' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('break_end')}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday('break_end') || !isTypeRegisteredToday('break_start')}
                >
                  <Coffee size={18} />
                  Fim Almoço
                </button>
                <button 
                  className={`clock-action-button exit ${isTypeRegisteredToday('exit') ? 'completed' : nextExpectedType === 'exit' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('exit')}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday('exit') || !isTypeRegisteredToday('break_end')}
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
                  <div className="schedule-name">{schedule.name}</div>
                  <div className="schedule-details">
                    <div className="schedule-detail-item">
                      <Timer size={16} />
                      <span>{schedule.hoursPerDay}h por dia</span>
                    </div>
                    <div className="schedule-detail-item">
                      <AlertCircle size={16} />
                      <span>Tolerância: {schedule.toleranceMinutes} min</span>
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
                              <div className={`history-type-icon ${record.type}`}>
                                <Clock size={16} />
                              </div>
                            </div>
                            <div className="history-card-content">
                              <span className="history-card-type">{typeLabels[record.type]}</span>
                              <span className="history-card-time">
                                <CalendarDays size={14} />
                                {formatDateTime(record.timestamp)}
                              </span>
                            </div>
                            {!record.validated && (
                              <span className="history-card-badge error">
                                <XCircle size={12} />
                                Erro
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {periodFilter === 'week' && (
                  <HistoryCalendar records={records} view="week" />
                )}

                {periodFilter === 'month' && (
                  <HistoryCalendar records={records} view="month" />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'solicitacoes' && (
          <div className="requests-section">
            <div className="section-header">
              <h2 className="section-title">Minhas Solicitações</h2>
              <button className="new-request-btn" onClick={() => setIsNewRequestModalOpen(true)}>
                <Plus size={16} />
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
                  const status = request.status.toLowerCase();
                  
                  return (
                    <div 
                      key={request.id} 
                      className={`request-card ${status}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="request-card-left">
                        <div className={`request-type-icon ${request.type}`}>
                          <FileText size={14} />
                        </div>
                      </div>
                      <div className="request-card-content">
                        <div className="request-card-header">
                          <span className="request-card-type">{requestTypeLabels[request.type]}</span>
                          <span className={`request-card-badge ${status}`}>
                            {status === 'pending' && <Clock size={12} />}
                            {status === 'approved' && <CheckCircle2 size={12} />}
                            {status === 'rejected' && <XCircle size={12} />}
                            {statusLabels[request.status]}
                          </span>
                        </div>
                        <p className="request-card-description">{request.description}</p>
                        {request.containsProof && (
                          <span className="request-proof-badge">📎 Contém comprovante</span>
                        )}
                        {request.createdAt && (
                          <div className="request-card-date">
                            <CalendarDays size={14} />
                            Solicitado em {formatDateTime(request.createdAt)}
                          </div>
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
