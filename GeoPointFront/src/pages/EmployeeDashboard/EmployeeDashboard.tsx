import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, History, List, MapPin, Check, Briefcase, Timer, AlertCircle, CalendarDays, FileText, CheckCircle2, XCircle, Plus, LogIn, LogOut, Coffee, UtensilsCrossed, Settings, Eye, EyeOff, Lock } from 'lucide-react';
import Header from '@/components/Header/Header';
import HistoryCalendar, { CalendarRecord } from '@/components/HistoryCalendar/HistoryCalendar';
import NewRequestModal, { DisplayRequest } from '@/components/NewRequestModal/NewRequestModal';
import RequestDetailModal from '@/components/RequestDetailModal/RequestDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  timeEntriesApi,
  requestsApi,
  workSchedulesApi,
  usersApi,
  TimeEntry,
  TimeEntryType,
  TimeEntryOrigin,
  RequestType,
  RequestStatus,
  WorkSchedule,
  calcScheduleHours,
  requestTypeLabels,
  requestStatusLabels,
  timeEntryTypeLabels,
} from '@/services/api';
import { toast } from 'sonner';
import './EmployeeDashboard.css';

type TabType = 'ponto' | 'historico' | 'solicitacoes' | 'conta';
type PeriodFilter = 'day' | 'week' | 'month';

// UI clock step — the 4-step daily flow matching TimeEntryType
type ClockStep = 'entry' | 'launch_time' | 'return_to_work' | 'exit';

const stepLabels: Record<ClockStep, string> = {
  entry: 'Entrada',
  launch_time: 'Início Intervalo',
  return_to_work: 'Fim Intervalo',
  exit: 'Saída',
};

const stepToApiType = (step: ClockStep): TimeEntryType => {
  switch (step) {
    case 'entry': return TimeEntryType.Entry;
    case 'launch_time': return TimeEntryType.LaunchTime;
    case 'return_to_work': return TimeEntryType.ReturnToWork;
    case 'exit': return TimeEntryType.Exit;
  }
};

const statusCssClass = (status: RequestStatus): string => {
  const map: Record<number, string> = { [RequestStatus.Pending]: 'pending', [RequestStatus.Accepted]: 'approved', [RequestStatus.Rejected]: 'rejected' };
  return map[status] || 'pending';
};

const mapTimeEntryToCalendarRecord = (entry: TimeEntry, userName: string): CalendarRecord => ({
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
  const [records, setRecords] = useState<CalendarRecord[]>([]);
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('day');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
      setRecords(entries.map(e => mapTimeEntryToCalendarRecord(e, user.name)));
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
      let userRequests: DisplayRequest[] = [];
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

  const getNextExpectedStep = (): ClockStep | null => {
    const todayCount = getTodayRecords().length;
    const steps: ClockStep[] = ['entry', 'launch_time', 'return_to_work', 'exit'];
    if (todayCount >= steps.length) return null;
    return steps[todayCount];
  };

  const isStepCompleted = (step: ClockStep): boolean => {
    const steps: ClockStep[] = ['entry', 'launch_time', 'return_to_work', 'exit'];
    return getTodayRecords().length > steps.indexOf(step);
  };

  const isStepEnabled = (step: ClockStep): boolean => {
    const steps: ClockStep[] = ['entry', 'launch_time', 'return_to_work', 'exit'];
    return locationStatus === 'success' && getTodayRecords().length === steps.indexOf(step);
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
        origin: TimeEntryOrigin.Web,
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
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || '';
      let parsed = '';
      try { parsed = JSON.parse(msg)?.message || msg; } catch { parsed = msg; }

      if (parsed.includes('Nenhum local de trabalho configurado')) {
        toast.error('Seu local de trabalho ainda não foi configurado. Solicite ao administrador.');
      } else if (parsed.includes('fora do local de trabalho permitido')) {
        toast.error('Você está fora da área permitida para registrar ponto. Verifique sua localização.');
      } else if (parsed.includes('Aguarde pelo menos')) {
        toast.error('Aguarde pelo menos 1 minuto entre registros de ponto.');
      } else if (parsed.includes('Jornada de 12h excedida')) {
        toast.error('Jornada de 12h excedida. Procure seu gestor.');
      } else {
        toast.error(parsed || 'Erro ao registrar ponto');
      }
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

  const scheduleHours = schedule ? calcScheduleHours(schedule) : 8;
  const scheduleTolerance = schedule?.toleranceMinutes || 15;
  const scheduleName = schedule?.name || 'Horário Comercial';

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!user) return;
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsChangingPassword(true);
    try {
      await usersApi.update(user.id, { password: passwordForm.newPassword });
      toast.success('Senha alterada com sucesso');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error(err);
      let msg = 'Erro ao alterar senha';
      try { msg = JSON.parse(err.message)?.message || msg; } catch {}
      toast.error(msg);
    }
    setIsChangingPassword(false);
  };

  const tabs = [
    { id: 'ponto' as TabType, label: 'Ponto', icon: Clock },
    { id: 'historico' as TabType, label: 'Histórico', icon: History },
    { id: 'solicitacoes' as TabType, label: 'Solicitações', icon: List },
    { id: 'conta' as TabType, label: 'Minha Conta', icon: Settings },
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
                  className={`clock-action-button break_start ${isStepCompleted('launch_time') ? 'completed' : nextExpectedStep === 'launch_time' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('launch_time')}
                  disabled={!isStepEnabled('launch_time')}
                >
                  <UtensilsCrossed size={18} />
                  Início Almoço
                </button>
                <button
                  className={`clock-action-button break_end ${isStepCompleted('return_to_work') ? 'completed' : nextExpectedStep === 'return_to_work' ? 'suggested' : ''}`}
                  onClick={() => handleRegisterTime('return_to_work')}
                  disabled={!isStepEnabled('return_to_work')}
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
                              <span className="history-type-label">{timeEntryTypeLabels[record.type]}</span>
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
                      className="request-card clickable"
                      style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
                      onClick={() => setSelectedRequestId(request.id)}
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
                            {requestStatusLabels[request.status] || 'Pendente'}
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

        {activeTab === 'conta' && (
          <div className="account-section">
            <div className="section-header">
              <h2 className="section-title">Minha Conta</h2>
            </div>

            <div className="account-card">
              <div className="account-card-header">
                <Lock size={20} />
                <h3>Alterar Senha</h3>
              </div>

              <div className="account-form">
                <div className="account-field">
                  <label className="account-label">Nova Senha</label>
                  <div className="account-input-wrapper">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      className="account-input"
                      placeholder="Digite a nova senha"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="account-field">
                  <label className="account-label">Confirmar Nova Senha</label>
                  <div className="account-input-wrapper">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="account-input"
                      placeholder="Confirme a nova senha"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  className="account-save-btn"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Salvando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <NewRequestModal
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        onSubmit={handleNewRequest}
        userId={user?.id || ''}
      />

      <RequestDetailModal
        isOpen={!!selectedRequestId}
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onUpdated={loadData}
      />
    </div>
  );
}
