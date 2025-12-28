import React, { useState } from 'react';
import { Calendar, Filter, X, User, FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header/Header';
import { mockRequests } from '@/data/mockData';
import { Request } from '@/types';
import { toast } from 'sonner';
import './RHDashboard.css';

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

export default function RHDashboard() {
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleApprove = (requestId: string) => {
    setRequests(prev => 
      prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r)
    );
    setSelectedRequest(null);
    toast.success('Solicitação aprovada com sucesso!');
  };

  const handleReject = (requestId: string) => {
    setRequests(prev => 
      prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r)
    );
    setSelectedRequest(null);
    toast.error('Solicitação rejeitada');
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

          {filteredRequests.length === 0 ? (
            <div className="rh-requests-empty">Nenhuma solicitação encontrada</div>
          ) : (
            <div className="rh-requests-list">
              {filteredRequests.map((request, index) => (
                <div 
                  key={request.id} 
                  className={`rh-request-card ${request.status}`}
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
                      <span className={`rh-request-badge ${request.status}`}>
                        {request.status === 'pending' && <Clock size={12} />}
                        {request.status === 'approved' && <CheckCircle2 size={12} />}
                        {request.status === 'rejected' && <XCircle size={12} />}
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    
                    <p className="rh-request-description">{request.description}</p>
                    
                    <div className="rh-request-meta">
                      <div className="rh-request-date-item">
                        <CalendarDays size={14} />
                        <span>Referência: <strong>{formatDate(request.referenceDate)}</strong></span>
                      </div>
                      <div className="rh-request-date-item">
                        <Clock size={14} />
                        <span>Solicitado: <strong>{formatDate(request.requestDate)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && (
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
              ))}
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
                      <span className="rh-modal-value">{formatDate(selectedRequest.referenceDate)}</span>
                    </div>
                  </div>
                  <div className="rh-modal-field">
                    <div className="rh-modal-field-icon">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="rh-modal-label">Data da Solicitação</span>
                      <span className="rh-modal-value">{formatDate(selectedRequest.requestDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="rh-modal-description">
                  <span className="rh-modal-label">Descrição / Justificativa</span>
                  <p className="rh-modal-description-text">{selectedRequest.description}</p>
                </div>
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
