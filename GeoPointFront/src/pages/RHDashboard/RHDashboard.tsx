import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, X, User, FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
  return ['pending', 'approved', 'rejected'][status] || 'pending';
};

export default function RHDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [users, setUsers] = useState<Map<string, ApiUser>>(new Map());
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<DisplayRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    try {
      await requestsApi.review(requestId, { reviewerId: user.id, newStatus: RequestStatus.Accepted });
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.Accepted } : r));
      setSelectedRequest(null);
      toast.success('Solicitação aprovada com sucesso!');
    } catch (err: any) {
      console.error('Error approving request:', err);
      let msg = 'Erro ao aprovar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    if (!rejectComment.trim()) {
      toast.error('É obrigatório informar o motivo ao rejeitar uma solicitação.');
      return;
    }
    try {
      await requestsApi.review(requestId, {
        reviewerId: user.id,
        newStatus: RequestStatus.Rejected,
        comment: rejectComment.trim(),
      });
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.Rejected } : r));
      setSelectedRequest(null);
      setRejectComment('');
      toast.error('Solicitação rejeitada');
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      let msg = 'Erro ao rejeitar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
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
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="rh-request-card-left">
                      <div className={`rh-request-type-badge ${status}`}>
                        <FileText size={14} />
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
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectComment('');
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

      {selectedRequest && (
        <div className="rh-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="rh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rh-modal-header">
              <div className="rh-modal-icon">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="rh-modal-title">Analisar Solicitação</h3>
                <p className="rh-modal-subtitle">{requestTypeLabels[selectedRequest.type]}</p>
              </div>
              <button className="rh-modal-close" onClick={() => setSelectedRequest(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="rh-modal-content">
              <div className="rh-modal-section">
                <div className="rh-modal-field-row">
                  <div className="rh-modal-field">
                    <div className="rh-modal-field-icon">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="rh-modal-label">Funcionário</span>
                      <span className="rh-modal-value">{selectedRequest.userName}</span>
                    </div>
                  </div>
                </div>

                <div className="rh-modal-field-row two-cols">
                  <div className="rh-modal-field">
                    <div className="rh-modal-field-icon">
                      <CalendarDays size={16} />
                    </div>
                    <div>
                      <span className="rh-modal-label">Data de Referência</span>
                      <span className="rh-modal-value">{formatDate(selectedRequest.targetDate)}</span>
                    </div>
                  </div>
                  <div className="rh-modal-field">
                    <div className="rh-modal-field-icon">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="rh-modal-label">Data da Solicitação</span>
                      <span className="rh-modal-value">{formatDate(selectedRequest.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="rh-modal-description">
                  <span className="rh-modal-label">Descrição / Justificativa</span>
                  <p className="rh-modal-description-text">{selectedRequest.description}</p>
                </div>

                {selectedRequest.containsProof && (
                  <div className="rh-modal-proof">
                    📎 Esta solicitação contém comprovante anexado
                  </div>
                )}
              </div>

              <div className="rh-modal-description" style={{ marginTop: '1rem' }}>
                <span className="rh-modal-label">Motivo da rejeição (obrigatório para rejeitar)</span>
                <textarea
                  className="rh-modal-description-text"
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.5rem',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    background: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                  }}
                  placeholder="Informe o motivo caso vá rejeitar..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
              </div>

              <div className="rh-modal-status-indicator">
                <AlertCircle size={16} />
                <span>Esta solicitação está aguardando sua análise</span>
              </div>
            </div>

            <div className="rh-modal-actions">
              <button className="rh-modal-button cancel" onClick={() => setSelectedRequest(null)}>
                Cancelar
              </button>
              <button className="rh-modal-button reject" onClick={() => handleReject(selectedRequest.id)}>
                <XCircle size={16} />
                Rejeitar
              </button>
              <button className="rh-modal-button approve" onClick={() => handleApprove(selectedRequest.id)}>
                <CheckCircle2 size={16} />
                Aprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
