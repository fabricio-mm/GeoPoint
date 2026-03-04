import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, X, User, FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Baby, Stethoscope } from 'lucide-react';
import Header from '@/components/Header/Header';
import {
  requestsApi,
  usersApi,
  ApiRequest,
  User as ApiUser,
  RequestType,
  RequestStatus,
  requestTypeLabels,
  requestStatusLabels,
  canReviewRequests,
  JobTitle,
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState<ApiRequest | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

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
          <button className="rh-tab">
            Solicitações recebidas
            {pendingCount > 0 && (
              <span className="rh-tab-badge">{pendingCount}</span>
            )}
          </button>
        </div>

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
