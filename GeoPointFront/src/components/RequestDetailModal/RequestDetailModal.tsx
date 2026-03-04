import React, { useState, useEffect } from 'react';
import { FileText, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, Save, Baby, Stethoscope, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  requestsApi,
  RequestType,
  RequestStatus,
  requestTypeLabels,
  requestStatusLabels,
  ApiRequest,
} from '@/services/api';
import { toast } from 'sonner';
import './RequestDetailModal.css';

interface RequestDetailModalProps {
  isOpen: boolean;
  requestId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const requestTypeIcons: Record<RequestType, React.ReactNode> = {
  [RequestType.MaternityLeave]: <Baby size={18} />,
  [RequestType.DoctorsNote]: <Stethoscope size={18} />,
  [RequestType.ForgotPunch]: <Clock size={18} />,
  [RequestType.Vacations]: <Calendar size={18} />,
};

const statusCssClass = (status: RequestStatus): string => {
  const map: Record<number, string> = { [RequestStatus.Pending]: 'pending', [RequestStatus.Accepted]: 'approved', [RequestStatus.Rejected]: 'rejected' };
  return map[status] || 'pending';
};

export default function RequestDetailModal({ isOpen, requestId, onClose, onUpdated }: RequestDetailModalProps) {
  const [request, setRequest] = useState<ApiRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editJustification, setEditJustification] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequest(requestId);
    } else {
      setRequest(null);
      setConfirmDelete(false);
    }
  }, [isOpen, requestId]);

  const loadRequest = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await requestsApi.getById(id);
      setRequest(data);
      // Pre-fill edit fields
      const dateStr = data.targetDate ? data.targetDate.split('T')[0] : '';
      setEditTargetDate(dateStr);
      setEditJustification(data.justificationUser || '');
    } catch (err) {
      console.error('Error loading request:', err);
      toast.error('Erro ao carregar solicitação');
      onClose();
    }
    setIsLoading(false);
  };

  const isPending = request?.status === RequestStatus.Pending;

  const handleSave = async () => {
    if (!request || !isPending) return;
    if (!editTargetDate) {
      toast.error('Informe a data de referência');
      return;
    }

    setIsSaving(true);
    try {
      await requestsApi.update(request.id, {
        targetDate: new Date(editTargetDate + 'T00:00:00').toISOString(),
        justification: editJustification.trim() || undefined,
      });
      toast.success('Solicitação atualizada com sucesso!');
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error updating request:', err);
      let msg = 'Erro ao atualizar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!request || !isPending) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await requestsApi.delete(request.id);
      toast.success('Solicitação cancelada com sucesso!');
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error deleting request:', err);
      let msg = 'Erro ao cancelar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    }
    setIsDeleting(false);
    setConfirmDelete(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--/--/----';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        {isLoading ? (
          <div className="request-detail-loading">
            <Clock className="animate-spin" size={32} />
            <span>Carregando...</span>
          </div>
        ) : request ? (
          <>
            <DialogHeader>
              <div className="request-detail-header-row">
                <div className="request-detail-type-icon">
                  {requestTypeIcons[request.type]}
                </div>
                <div>
                  <DialogTitle>{requestTypeLabels[request.type]}</DialogTitle>
                  <DialogDescription>
                    Solicitação #{request.id.slice(0, 8)}
                  </DialogDescription>
                </div>
                <span className={`request-detail-status-badge ${statusCssClass(request.status)}`}>
                  {request.status === RequestStatus.Pending && <Clock size={14} />}
                  {request.status === RequestStatus.Accepted && <CheckCircle2 size={14} />}
                  {request.status === RequestStatus.Rejected && <XCircle size={14} />}
                  {requestStatusLabels[request.status]}
                </span>
              </div>
            </DialogHeader>

            <div className="request-detail-body">
              {/* Info fields - always visible */}
              <div className="request-detail-info-grid">
                {request.requester && (
                  <div className="request-detail-info-item">
                    <span className="request-detail-info-label">Solicitante</span>
                    <span className="request-detail-info-value">{request.requester.fullName}</span>
                  </div>
                )}
                <div className="request-detail-info-item">
                  <span className="request-detail-info-label">Criado em</span>
                  <span className="request-detail-info-value">{formatDateTime(request.createdAt)}</span>
                </div>
              </div>

              {/* Target Date */}
              <div className="request-detail-field">
                <Label htmlFor="detail-targetDate">
                  <CalendarDays size={14} className="inline mr-1" />
                  Data de Referência
                </Label>
                {isPending ? (
                  <input
                    type="date"
                    id="detail-targetDate"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                  />
                ) : (
                  <p className="request-detail-readonly-value">{formatDate(request.targetDate)}</p>
                )}
              </div>

              {/* Justification */}
              <div className="request-detail-field">
                <Label htmlFor="detail-justification">Justificativa</Label>
                {isPending ? (
                  <Textarea
                    id="detail-justification"
                    value={editJustification}
                    onChange={(e) => setEditJustification(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Descreva o motivo..."
                  />
                ) : (
                  <p className="request-detail-readonly-value">
                    {request.justificationUser || 'Sem justificativa informada'}
                  </p>
                )}
              </div>

              {/* Reviewer info (if reviewed) */}
              {request.reviewer && (
                <div className="request-detail-field">
                  <Label>Avaliador</Label>
                  <p className="request-detail-readonly-value">{request.reviewer.fullName}</p>
                </div>
              )}

              {/* Attachments */}
              {request.attachments && request.attachments.length > 0 && (
                <div className="request-detail-field">
                  <Label>Anexos</Label>
                  <div className="request-detail-attachments">
                    {request.attachments.map((att) => (
                      <span key={att.id} className="request-detail-attachment-item">
                        📎 {att.fileType || 'Arquivo'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status message for non-pending */}
              {!isPending && (
                <div className={`request-detail-status-message ${statusCssClass(request.status)}`}>
                  {request.status === RequestStatus.Accepted && (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Esta solicitação foi aprovada e não pode ser alterada.</span>
                    </>
                  )}
                  {request.status === RequestStatus.Rejected && (
                    <>
                      <XCircle size={16} />
                      <span>Esta solicitação foi rejeitada e não pode ser alterada.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="request-detail-footer">
              {isPending ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="mr-auto"
                  >
                    <Trash2 size={16} />
                    {confirmDelete ? 'Confirmar cancelamento' : 'Cancelar solicitação'}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={isSaving || isDeleting}>
                    <Save size={16} />
                    {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
