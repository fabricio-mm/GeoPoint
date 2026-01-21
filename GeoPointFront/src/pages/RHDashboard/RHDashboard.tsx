import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, X, User, FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header/Header';
import { requestsApi, Request as ApiRequest, usersApi, User as ApiUser } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import './RHDashboard.css';

interface DisplayRequest {
  id: string;
  requesterId: string;
  userName: string;
  type: number | string;
  status: number | string;
  description: string;
  containsProof: boolean;
  targetDate?: string;
  createdAt?: string;
}

// API  types: 0=CERTIFICATE, 1=FORGOT_PUNCH, 2=VACATION
const requestTypeLabels: Record<string | number, string> = {
  0: 'Atestado Médico',
  1: 'Esquecimento de Ponto',
  2: 'Férias',
  CERTIFICATE: 'Atestado Médico',
  FORGOT_PUNCH: 'Esquecimento de Ponto',
  VACATION: 'Férias',
};

// API  status: 0=PENDING, 1=APPROVED, 2=REJECTED
const statusLabels: Record<string | number, string> = {
  0: 'Pendente',
  1: 'Aprovado',
  2: 'Rejeitado',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

// Map numeric status to string for CSS classes
const statusToString = (status: number | string): string => {
  if (typeof status === 'number') {
    return ['pending', 'approved', 'rejected'][status] || 'pending';
  }
  return status.toString().toLowerCase();
};

export default function RHDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [users, setUsers] = useState<Map<string, ApiUser>>(new Map());
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<DisplayRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load users first for name mapping
      const usersData = await usersApi.getAll();
      const usersMap = new Map(usersData.map(u => [u.id, u]));
      setUsers(usersMap);

      // Load pending requests
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

  const pendingCount = requests.filter(r => statusToString(r.status) === 'pending').length;

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return statusToString(request.status) === statusFilter;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/----';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    try {
      await requestsApi.review(requestId, {
        reviewerId: user.id,
        newStatus: 'APPROVED',
      });
      
      setRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 1 } : r) // 1 = APPROVED
      );
      setSelectedRequest(null);
      toast.success('Solicitação aprovada com sucesso!');
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Erro ao aprovar solicitação');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    
    try {
      await requestsApi.review(requestId, {
        reviewerId: user.id,
        newStatus: 'REJECTED',
      });
      
      setRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 2 } : r) // 2 = REJECTED
      );
      setSelectedRequest(null);
      toast.error('Solicitação rejeitada');
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Erro ao rejeitar solicitação');
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
                const status = statusToString(request.status);
                return (
                  <div 
                    key={request.id} 
                    className={`rh-request-card ${status}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="rh-request-card-left">
                      <div className={`rh-request-type-badge ${request.type}`}>
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
                          {statusLabels[request.status]}
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
                          onClick={() => setSelectedRequest(request)}
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

              <div className="rh-modal-status-indicator">
                <AlertCircle size={16} />
                <span>Esta solicitação está aguardando sua análise</span>
              </div>
            </div>

            <div className="rh-modal-actions">
              <button
                className="rh-modal-button cancel"
                onClick={() => setSelectedRequest(null)}
              >
                Cancelar
              </button>
              <button
                className="rh-modal-button reject"
                onClick={() => handleReject(selectedRequest.id)}
              >
                <XCircle size={16} />
                Rejeitar
              </button>
              <button
                className="rh-modal-button approve"
                onClick={() => handleApprove(selectedRequest.id)}
              >
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
