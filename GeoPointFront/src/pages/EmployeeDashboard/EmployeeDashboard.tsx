import React, { useState, useEffect, useMemo } from 'react';
import { Clock, History, List, MapPin, Check, Briefcase, Timer, AlertCircle, CalendarDays, FileText, CheckCircle2, XCircle, Plus } from 'lucide-react';
import Header from '@/components/Header/Header';
import HistoryCalendar from '@/components/HistoryCalendar/HistoryCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { mockTimeRecords, mockRequests, mockWorkSchedules } from '@/data/mockData';
import { TimeRecord, Request } from '@/types';
import { toast } from 'sonner';
import './EmployeeDashboard.css';

type TabType = 'ponto' | 'historico' | 'solicitacoes';
type PeriodFilter = 'day' | 'week' | 'month';

const typeLabels: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  break_start: 'Início Intervalo',
  break_end: 'Fim Intervalo',
};

const requestTypeLabels: Record<string, string> = {
  medical_certificate: 'Atestado Médico',
  vacation: 'Férias',
  time_adjustment: 'Ajuste de Ponto',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('ponto');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('day');
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

  useEffect(() => {
    if (user) {
      setRecords(mockTimeRecords.filter(r => r.userId === user.id));
      setRequests(mockRequests.filter(r => r.userId === user.id));
    }
  }, [user]);

  useEffect(() => {
    // Simulate geolocation check
    const checkLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationStatus('success'),
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

  const handleClockIn = () => {
    if (locationStatus !== 'success') {
      toast.error('Não é possível registrar ponto sem localização válida');
      return;
    }
    
    const newRecord: TimeRecord = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: user?.name || '',
      type: 'entry',
      timestamp: new Date(),
      location: { lat: -23.5489, lng: -46.6388 },
      validated: true,
    };
    
    setRecords(prev => [newRecord, ...prev]);
    toast.success('Ponto registrado com sucesso!');
  };

  const retryLocation = () => {
    setLocationStatus('checking');
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationStatus('success'),
          () => setLocationStatus('error')
        );
      }
    }, 500);
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

              <button 
                className="clock-action-button" 
                onClick={handleClockIn}
                disabled={locationStatus !== 'success'}
              >
                <Clock size={20} />
                Registrar Entrada
              </button>
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
          </div>
        )}

        {activeTab === 'solicitacoes' && (
          <div className="requests-section">
            <div className="section-header">
              <h2 className="section-title">Minhas Solicitações</h2>
              <button className="new-request-btn">
                <Plus size={16} />
                Nova Solicitação
              </button>
            </div>
            {requests.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <span>Nenhuma solicitação encontrada</span>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((request, index) => (
                  <div 
                    key={request.id} 
                    className={`request-card ${request.status}`}
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
                        <span className={`request-card-badge ${request.status}`}>
                          {request.status === 'pending' && <Clock size={12} />}
                          {request.status === 'approved' && <CheckCircle2 size={12} />}
                          {request.status === 'rejected' && <XCircle size={12} />}
                          {statusLabels[request.status]}
                        </span>
                      </div>
                      <p className="request-card-description">{request.description}</p>
                      <div className="request-card-date">
                        <CalendarDays size={14} />
                        Solicitado em {formatDateTime(request.requestDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
