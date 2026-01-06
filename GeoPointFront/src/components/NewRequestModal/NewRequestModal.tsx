import React, { useState } from 'react';
import { X, FileText, Calendar, Clock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { requestsApi, RequestType } from '@/services/api';
import { toast } from 'sonner';
import './NewRequestModal.css';

export type { RequestType } from '@/services/api';

export interface DisplayRequest {
  id: string;
  type: string;
  status: string;
  description: string;
  containsProof?: boolean;
  createdAt?: Date;
}

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: DisplayRequest) => void;
  userId: string;
}

const requestTypeLabels: Record<RequestType, string> = {
  CERTIFICATE: 'Atestado Médico',
  FORGOT_PUNCH: 'Esquecimento de Ponto',
  VACATION: 'Férias',
};

const requestTypeIcons: Record<RequestType, React.ReactNode> = {
  CERTIFICATE: <FileText size={16} />,
  FORGOT_PUNCH: <Clock size={16} />,
  VACATION: <Calendar size={16} />,
};

export default function NewRequestModal({ isOpen, onClose, onSubmit, userId }: NewRequestModalProps) {
  const [type, setType] = useState<RequestType | ''>('');
  const [justification, setJustification] = useState('');
  const [containsProof, setContainsProof] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!type) {
      toast.error('Selecione o tipo de solicitação');
      return;
    }
    
    if (!justification.trim()) {
      toast.error('Informe a justificativa');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await requestsApi.create({
        requesterId: userId,
        type,
        targetDate: targetDate || undefined,
        justification: justification.trim(),
        containsProof,
      });

      const displayRequest: DisplayRequest = {
        id: result.id,
        type: result.type,
        status: result.status,
        description: result.justificationUser,
        containsProof: result.containsProof,
        createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
      };

      onSubmit(displayRequest);
      
      // Reset form
      setType('');
      setJustification('');
      setContainsProof(false);
      setTargetDate('');
      
      toast.success('Solicitação enviada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Error creating request:', err);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setType('');
    setJustification('');
    setContainsProof(false);
    setTargetDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nova Solicitação</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <Label htmlFor="type">Tipo de Solicitação *</Label>
            <Select value={type} onValueChange={(value) => setType(value as RequestType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(requestTypeLabels) as RequestType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    <div className="select-item-content">
                      {requestTypeIcons[key]}
                      <span>{requestTypeLabels[key]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-group">
            <Label htmlFor="targetDate">Data de Referência</Label>
            <input
              type="date"
              id="targetDate"
              className="date-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              placeholder="Descreva o motivo da sua solicitação..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <span className="char-count">{justification.length}/500</span>
          </div>

          <div className="form-group switch-group">
            <div className="switch-content">
              <div className="switch-icon">
                <Upload size={18} />
              </div>
              <div className="switch-text">
                <Label htmlFor="contains-proof">Contém comprovante</Label>
                <span className="switch-description">
                  Marque se você possui documentos para anexar
                </span>
              </div>
            </div>
            <Switch
              id="contains-proof"
              checked={containsProof}
              onCheckedChange={setContainsProof}
            />
          </div>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
