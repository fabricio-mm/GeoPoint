import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, X, User, FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Baby, Stethoscope, UserPlus, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header/Header';
import {
  requestsApi,
  usersApi,
  workSchedulesApi,
  ApiRequest,
  User as ApiUser,
  UserCreate,
  WorkSchedule,
  RequestType,
  RequestStatus,
  UserRole,
  Department,
  JobTitle,
  requestTypeLabels,
  requestStatusLabels,
  userRoleLabels,
  departmentLabels,
  jobTitleLabels,
  canReviewRequests,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import './RHDashboard.css';

interface DisplayRequest {
  id: string;
  requesterId: string;
  userName: string;
  type: RequestType;
  status: RequestStatus;
  description: string;
  containsProof: boolean;
  targetDate?: string;
  createdAt?: string;
}

const statusCssClass = (status: RequestStatus): string => {
  const map: Record<number, string> = { [RequestStatus.Pending]: 'pending', [RequestStatus.Accepted]: 'approved', [RequestStatus.Rejected]: 'rejected' };
  return map[status] || 'pending';
};

const requestTypeIcons: Record<RequestType, React.ReactNode> = {
  [RequestType.MaternityLeave]: <Baby size={18} />,
  [RequestType.DoctorsNote]: <Stethoscope size={18} />,
  [RequestType.ForgotPunch]: <Clock size={18} />,
  [RequestType.Vacations]: <Calendar size={18} />,
};

export default function RHDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [users, setUsers] = useState<Map<string, ApiUser>>(new Map());
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectComment, setRejectComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'register'>('requests');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState<ApiRequest | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Register form state
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [registerForm, setRegisterForm] = useState<UserCreate>({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.Employee,
    workScheduleId: 0,
    department: Department.IT,
    jobTitle: JobTitle.SoftwareEngineer,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersData = await usersApi.getAll();
      const usersMap = new Map(usersData.map(u => [u.id, u]));
      setUsers(usersMap);

      const pendingRequests = await requestsApi.getPending();
      const mappedRequests: DisplayRequest[] = pendingRequests.map(r => ({
        id: r.id,
        requesterId: r.requesterId,
        userName: r.requester?.fullName || usersMap.get(r.requesterId)?.fullName || 'Usuário',
        type: r.type,
        status: r.status,
        description: r.justificationUser,
        containsProof: r.containsProof,
        targetDate: r.targetDate,
        createdAt: r.createdAt,
      }));

      setRequests(mappedRequests);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar solicitações');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    workSchedulesApi.getAll().then(setWorkSchedules).catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.fullName.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsRegistering(true);
    try {
      await usersApi.create(registerForm);
      toast.success('Funcionário cadastrado com sucesso!');
      setRegisterForm({
        fullName: '',
        email: '',
        password: '',
        role: UserRole.Employee,
        workScheduleId: 0,
        department: Department.IT,
        jobTitle: JobTitle.SoftwareEngineer,
      });
      loadData();
    } catch (err: any) {
      let msg = 'Erro ao cadastrar funcionário';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {
        if (err.message && !err.message.startsWith('HTTP')) msg = err.message;
      }
      toast.error(msg);
    }
    setIsRegistering(false);
  };

  const pendingCount = requests.filter(r => r.status === RequestStatus.Pending).length;

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return statusCssClass(request.status) === statusFilter;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/----';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const openReviewModal = async (requestId: string) => {
    setModalOpen(true);
    setModalLoading(true);
    setRejectComment('');
    try {
      const data = await requestsApi.getById(requestId);
      setModalRequest(data);
    } catch (err) {
      console.error('Error loading request details:', err);
      toast.error('Erro ao carregar detalhes da solicitação');
      setModalOpen(false);
    }
    setModalLoading(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalRequest(null);
    setRejectComment('');
  };

  const handleApprove = async () => {
    if (!user || !modalRequest) return;
    setIsApproving(true);
    try {
      await requestsApi.review(modalRequest.id, { reviewerId: user.id, newStatus: RequestStatus.Accepted });
      toast.success('Solicitação aprovada com sucesso!');
      closeModal();
      loadData();
    } catch (err: any) {
      console.error('Error approving request:', err);
      let msg = 'Erro ao aprovar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
    setIsApproving(false);
  };

  const handleReject = async () => {
    if (!user || !modalRequest) return;
    if (!rejectComment.trim()) {
      toast.error('É obrigatório informar o motivo ao rejeitar uma solicitação.');
      return;
    }
    setIsRejecting(true);
    try {
      await requestsApi.review(modalRequest.id, {
        reviewerId: user.id,
        newStatus: RequestStatus.Rejected,
        comment: rejectComment.trim(),
      });
      toast.error('Solicitação rejeitada');
      closeModal();
      loadData();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      let msg = 'Erro ao rejeitar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
    setIsRejecting(false);
  };

  return (
    <div className="rh-dashboard">
      <Header />
      <main className="rh-content">
        <div className="rh-tabs">
          <button
            className={`rh-tab ${activeTab === 'requests' ? '' : 'rh-tab-inactive'}`}
            onClick={() => setActiveTab('requests')}
          >
            Solicitações recebidas
            {pendingCount > 0 && (
              <span className="rh-tab-badge">{pendingCount}</span>
            )}
          </button>
          <button
            className={`rh-tab ${activeTab === 'register' ? '' : 'rh-tab-inactive'}`}
            onClick={() => setActiveTab('register')}
          >
            <UserPlus size={16} />
            Cadastrar Funcionário
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="rh-requests-card">
            <h2 className="rh-requests-title">Solicitações de funcionários</h2>

            <div className="rh-filters">
              <button className="rh-filter-button">
                <Calendar size={16} />
                Data
                <Filter size={14} />
              </button>
              <select
                className="rh-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
              </select>
            </div>

            {isLoading ? (
              <div className="rh-requests-empty">Carregando...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="rh-requests-empty">Nenhuma solicitação encontrada</div>
            ) : (
              <div className="rh-requests-list">
                {filteredRequests.map((request, index) => {
                  const status = statusCssClass(request.status);
                  return (
                    <div
                      key={request.id}
                      className={`rh-request-card ${status}`}
                      style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
                      onClick={() => openReviewModal(request.id)}
                    >
                      <div className="rh-request-card-left">
                        <div className={`rh-request-type-badge ${status}`}>
                          {requestTypeIcons[request.type] || <FileText size={14} />}
                        </div>
                      </div>

                      <div className="rh-request-card-content">
                        <div className="rh-request-card-header">
                          <div className="rh-request-card-info">
                            <h4 className="rh-request-employee">{request.userName}</h4>
                            <span className="rh-request-type">{requestTypeLabels[request.type]}</span>
                          </div>
                          <span className={`rh-request-badge ${status}`}>
                            {status === 'pending' && <Clock size={12} />}
                            {status === 'approved' && <CheckCircle2 size={12} />}
                            {status === 'rejected' && <XCircle size={12} />}
                            {requestStatusLabels[request.status]}
                          </span>
                        </div>

                        <p className="rh-request-description">{request.description}</p>

                        <div className="rh-request-meta">
                          {request.targetDate && (
                            <div className="rh-request-date-item">
                              <CalendarDays size={14} />
                              <span>Referência: <strong>{formatDate(request.targetDate)}</strong></span>
                            </div>
                          )}
                          <div className="rh-request-date-item">
                            <Clock size={14} />
                            <span>Solicitado: <strong>{formatDate(request.createdAt)}</strong></span>
                          </div>
                          {request.containsProof && (
                            <span className="rh-request-proof">📎 Contém comprovante</span>
                          )}
                        </div>
                      </div>

                      {status === 'pending' && (
                        <div className="rh-request-card-action">
                          <button
                            className="rh-analyze-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReviewModal(request.id);
                            }}
                          >
                            Analisar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div className="rh-requests-card">
            <h2 className="rh-requests-title">Cadastrar novo funcionário</h2>

            <form className="rh-register-form" onSubmit={handleRegister}>
              <div className="rh-register-row">
                <div className="rh-register-field">
                  <Label htmlFor="reg-name">Nome Completo *</Label>
                  <Input
                    id="reg-name"
                    placeholder="Ex: João da Silva"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm(f => ({ ...f, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="rh-register-field">
                  <Label htmlFor="reg-email">E-mail *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="rh-register-row">
                <div className="rh-register-field">
                  <Label htmlFor="reg-password">Senha *</Label>
                  <div className="rh-register-password-wrapper">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="rh-register-eye-btn"
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="rh-register-field">
                  <Label htmlFor="reg-role">Vínculo</Label>
                  <select
                    id="reg-role"
                    className="rh-filter-select rh-register-select"
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm(f => ({ ...f, role: Number(e.target.value) }))}
                  >
                    {Object.entries(userRoleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rh-register-row">
                <div className="rh-register-field">
                  <Label htmlFor="reg-dept">Departamento</Label>
                  <select
                    id="reg-dept"
                    className="rh-filter-select rh-register-select"
                    value={registerForm.department}
                    onChange={(e) => setRegisterForm(f => ({ ...f, department: Number(e.target.value) }))}
                  >
                    {Object.entries(departmentLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="rh-register-field">
                  <Label htmlFor="reg-jobtitle">Cargo</Label>
                  <select
                    id="reg-jobtitle"
                    className="rh-filter-select rh-register-select"
                    value={registerForm.jobTitle}
                    onChange={(e) => setRegisterForm(f => ({ ...f, jobTitle: Number(e.target.value) }))}
                  >
                    {Object.entries(jobTitleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rh-register-row">
                <div className="rh-register-field">
                  <Label htmlFor="reg-schedule">Jornada de Trabalho</Label>
                  <select
                    id="reg-schedule"
                    className="rh-filter-select rh-register-select"
                    value={registerForm.workScheduleId}
                    onChange={(e) => setRegisterForm(f => ({ ...f, workScheduleId: Number(e.target.value) }))}
                  >
                    {workSchedules.length > 0 ? (
                      workSchedules.map(ws => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name} ({ws.startTime.slice(0, 5)} - {ws.endTime.slice(0, 5)})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={0}>Comercial (08:00 - 17:00)</option>
                        <option value={1}>Estágio (08:00 - 15:00)</option>
                        <option value={2}>Terceirizado (09:00 - 18:00)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="rh-register-actions">
                <Button type="submit" disabled={isRegistering} className="rh-register-submit">
                  <UserPlus size={16} />
                  {isRegistering ? 'Cadastrando...' : 'Cadastrar Funcionário'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Review Modal using Dialog */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[560px]">
          {modalLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Clock className="animate-spin text-primary" size={32} />
              <span className="text-sm text-muted-foreground">Carregando detalhes...</span>
            </div>
          ) : modalRequest ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    {requestTypeIcons[modalRequest.type]}
                  </div>
                  <div className="flex-1">
                    <DialogTitle>{requestTypeLabels[modalRequest.type]}</DialogTitle>
                    <DialogDescription>
                      Solicitação #{modalRequest.id.slice(0, 8)}
                    </DialogDescription>
                  </div>
                  <span className={`request-detail-status-badge ${statusCssClass(modalRequest.status)}`}>
                    {modalRequest.status === RequestStatus.Pending && <Clock size={14} />}
                    {modalRequest.status === RequestStatus.Accepted && <CheckCircle2 size={14} />}
                    {modalRequest.status === RequestStatus.Rejected && <XCircle size={14} />}
                    {requestStatusLabels[modalRequest.status]}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Requester & dates */}
                <div className="grid grid-cols-2 gap-3">
                  {modalRequest.requester && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Solicitante</span>
                      <p className="text-sm font-semibold">{modalRequest.requester.fullName}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Criado em</span>
                    <p className="text-sm">{formatDateTime(modalRequest.createdAt)}</p>
                  </div>
                </div>

                {/* Target Date */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <CalendarDays size={14} />
                    Data de Referência
                  </Label>
                  <p className="text-sm font-medium bg-muted/50 px-3 py-2 rounded-md">
                    {formatDate(modalRequest.targetDate)}
                  </p>
                </div>

                {/* Justification */}
                <div className="space-y-1">
                  <Label>Justificativa do Funcionário</Label>
                  <p className="text-sm bg-muted/50 px-3 py-2 rounded-md">
                    {modalRequest.justificationUser || 'Sem justificativa informada'}
                  </p>
                </div>

                {/* Attachments */}
                {modalRequest.attachments && modalRequest.attachments.length > 0 && (
                  <div className="space-y-1">
                    <Label>Anexos</Label>
                    <div className="flex flex-wrap gap-2">
                      {modalRequest.attachments.map((att) => (
                        <span key={att.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1.5 rounded-md">
                          📎 {att.fileType || 'Arquivo'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Already reviewed info */}
                {modalRequest.status !== RequestStatus.Pending && (
                  <>
                    {modalRequest.reviewer && (
                      <div className="space-y-1">
                        <Label>Avaliado por</Label>
                        <p className="text-sm font-medium">{modalRequest.reviewer.fullName}</p>
                      </div>
                    )}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                      modalRequest.status === RequestStatus.Accepted
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {modalRequest.status === RequestStatus.Accepted ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      <span>
                        {modalRequest.status === RequestStatus.Accepted
                          ? 'Esta solicitação já foi aprovada.'
                          : 'Esta solicitação já foi rejeitada.'}
                      </span>
                    </div>
                  </>
                )}

                {/* Reject comment field - only for pending */}
                {modalRequest.status === RequestStatus.Pending && (
                  <div className="space-y-1">
                    <Label htmlFor="rh-reject-comment">
                      Motivo da rejeição <span className="text-muted-foreground font-normal">(obrigatório para rejeitar)</span>
                    </Label>
                    <Textarea
                      id="rh-reject-comment"
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      rows={3}
                      placeholder="Informe o motivo caso vá rejeitar..."
                    />
                  </div>
                )}

                {/* Pending indicator */}
                {modalRequest.status === RequestStatus.Pending && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle size={16} />
                    <span>Esta solicitação está aguardando sua análise</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                {modalRequest.status === RequestStatus.Pending ? (
                  <div className="flex w-full justify-between">
                    <Button variant="outline" onClick={closeModal}>
                      Cancelar
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isRejecting || isApproving}
                      >
                        <XCircle size={16} />
                        {isRejecting ? 'Rejeitando...' : 'Rejeitar'}
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                      >
                        <CheckCircle2 size={16} />
                        {isApproving ? 'Aprovando...' : 'Aprovar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={closeModal}>
                    Fechar
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
