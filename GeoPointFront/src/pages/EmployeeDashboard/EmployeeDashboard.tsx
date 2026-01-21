import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, History, List, MapPin, Check, Briefcase, Timer, AlertCircle,
  CalendarDays, FileText, CheckCircle2, XCircle, Plus, LogIn, LogOut,
  Coffee, UtensilsCrossed
} from 'lucide-react';

import Header from '@/components/Header/Header';
import HistoryCalendar from '@/components/HistoryCalendar/HistoryCalendar';
import NewRequestModal from '@/components/NewRequestModal/NewRequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { mockWorkSchedules } from '@/data/mockData';
import { TimeRecord } from '@/types';
import {
  timeEntriesApi,
  requestsApi,
  TimeEntry,
  TimeEntryType
} from '@/services/api';
import { toast } from 'sonner';
import './EmployeeDashboard.css';

type TabType = 'ponto' | 'historico' | 'solicitacoes';
type PeriodFilter = 'day' | 'week' | 'month';


const ENTRY = 1;
const EXIT = 2;

type UiTimeType = 1 | 2;


const typeLabels: Record<UiTimeType, string> = {
  1: 'Entrada',
  2: 'Saída',
};

const uiToApiType: Record<UiTimeType, TimeEntryType> = {
  1: ENTRY,
  2: EXIT
};

const requestTypeLabels: Record<string, string> = {
  CERTIFICATE: 'Atestado Médico',
  FORGOT_PUNCH: 'Esquecimento de Ponto',
  VACATION: 'Férias',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};


const mapTimeEntryToRecord = (
  entry: TimeEntry,
  userName: string
): TimeRecord => ({
  id: entry.id,
  userId: entry.userId,
  userName,
  type: entry.type === ENTRY ? 1 : 2,
  timestamp: entry.createdAt ? new Date(entry.createdAt) : new Date(),
  location: {
    lat: entry.latitudeRecorded,
    lng: entry.longitudeRecorded,
  },
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
  const [locationStatus, setLocationStatus] =
    useState<'checking' | 'success' | 'error'>('checking');
  const [currentLocation, setCurrentLocation] =
    useState<{ lat: number; lng: number } | null>(null);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('day');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const schedule = mockWorkSchedules[0];

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
      const pending = await requestsApi.getPending();
      setRequests(
        pending
          .filter(r => r.requesterId === user.id)
          .map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            description: r.justificationUser,
            containsProof: r.containsProof,
            createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
          }))
      );
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

console.log('filteredRecords', filteredRecords)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationStatus('success');
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setLocationStatus('error')
    );
  }, []);

  const getTodayRecords = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return records.filter(r => r.timestamp >= start);
  };

  const getNextExpectedType = (): UiTimeType | null => {
    const today = getTodayRecords();
    if (today.length === 0) return 1;

    const last = today[today.length - 1].type;

    switch (last) {
      case 1: return 1;
      case 2: return 2;
      default: return null;
    }
  };

  const handleRegisterTime = async (type: UiTimeType) => {
    if (!user || !currentLocation || locationStatus !== 'success') {
      toast.error('Localização inválida');
      return;
    }

    try {
      await timeEntriesApi.create({
        userId: user.id,
        type: uiToApiType[type], 
        origin: 'WEB',
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      setRecords(prev => [
        {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          type,
          timestamp: new Date(),
          location: currentLocation,
          validated: true,
        },
        ...prev,
      ]);

      toast.success(`${typeLabels[type]} registrada com sucesso`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar ponto');
    }
  };

  const isTypeRegisteredToday = (type: UiTimeType) =>
    getTodayRecords().some(r => r.type === type);

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

  const formatTime = (date: Date) => 
    { 
      return date.toLocaleTimeString('pt-BR', 
        { hour: '2-digit', minute: '2-digit', second: '2-digit' }); 
      };


    const formatDate = (date: Date) => 
      { return date.toLocaleDateString('pt-BR', 
        { weekday: 'long', 
        day: 'numeric',
        month: 'long', 
        year: 'numeric' }); 
      };
  const formatDateTime = (date: Date) => {
     return date.toLocaleString('pt-BR', 
      { day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
         hour: '2-digit', 
         minute: '2-digit', }); 
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
                  className={`clock-action-button entry ${isTypeRegisteredToday(1) ? 'completed' : nextExpectedType === 1 ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime(1)}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday(1)}
                >
                  <LogIn size={18} />
                  Entrada
                </button>
                <button 
                  className={`clock-action-button break_start ${isTypeRegisteredToday(2) ? 'completed' : nextExpectedType === 2 ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime(2)}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday(2) || !isTypeRegisteredToday(1)}
                >
                  <UtensilsCrossed size={18} />
                  Início Almoço
                </button>
                <button 
                  className={`clock-action-button break_end ${isTypeRegisteredToday(2) ? 'completed' : nextExpectedType === 2 ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime(2)}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday(2) || !isTypeRegisteredToday(2)}
                >
                  <Coffee size={18} />
                  Fim Almoço
                </button>
                <button 
                  className={`clock-action-button exit ${isTypeRegisteredToday(2) ? 'completed' : nextExpectedType === 2 ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime(2)}
                  disabled={locationStatus !== 'success' || isTypeRegisteredToday(2) || !isTypeRegisteredToday(2)}
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
