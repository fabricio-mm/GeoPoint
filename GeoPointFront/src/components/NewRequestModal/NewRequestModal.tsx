import React, { useState } from 'react';
import { FileText, Calendar, Clock, Paperclip, X, Baby, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { requestsApi, RequestType, RequestStatus, requestTypeLabels } from '@/services/api';
import { toast } from 'sonner';

export interface DisplayRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
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

const requestTypeIcons: Record<RequestType, React.ReactNode> = {
  [RequestType.MaternityLeave]: <Baby size={16} />,
  [RequestType.DoctorsNote]: <Stethoscope size={16} />,
  [RequestType.ForgotPunch]: <Clock size={16} />,
  [RequestType.Vacations]: <Calendar size={16} />,
};

const requestTypes: RequestType[] = [
  RequestType.MaternityLeave,
  RequestType.DoctorsNote,
  RequestType.ForgotPunch,
  RequestType.Vacations,
];

export default function NewRequestModal({ isOpen, onClose, onSubmit, userId }: NewRequestModalProps) {
  const [type, setType] = useState<RequestType | null>(null);
  const [justification, setJustification] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const resetForm = () => {
    setType(null);
    setJustification('');
    setTargetDate('');
    setFiles([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const requiresAttachment = type === RequestType.DoctorsNote;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === null) { toast.error('Selecione o tipo de solicitação'); return; }
    if (!targetDate) { toast.error('Informe a data de referência'); return; }

    if (requiresAttachment && files.length === 0) {
      toast.error('Para atestado médico, o envio do comprovante é obrigatório.');
      return;
    }

    if (type === RequestType.Vacations) {
      const target = new Date(targetDate + 'T00:00:00');
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 30);
      if (target < minDate) {
        toast.error('Férias devem ser solicitadas com no mínimo 30 dias de antecedência.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await requestsApi.create({
        requesterId: userId,
        type,
        targetDate,
        justification: justification.trim() || undefined,
        attachments: files.length > 0 ? files : undefined,
      });

      const displayRequest: DisplayRequest = {
        id: result.id,
        type: result.type,
        status: RequestStatus.Pending,
        description: result.justificationUser || justification,
        containsProof: files.length > 0 || result.containsProof,
        createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
      };

      onSubmit(displayRequest);
      resetForm();
      toast.success('Solicitação enviada com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('Error creating request:', err);
      let msg = 'Erro ao enviar solicitação';
      try { const p = JSON.parse(err.message); if (p.message) msg = p.message; } catch {}
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
          <DialogDescription>Preencha os dados abaixo para enviar sua solicitação.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo de Solicitação *</Label>
            <Select value={type !== null ? String(type) : ''} onValueChange={(value) => setType(Number(value) as RequestType)}>
              <SelectTrigger id="type"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {requestTypes.map((reqType) => (
                  <SelectItem key={reqType} value={String(reqType)}>
                    <div className="flex items-center gap-2">
                      {requestTypeIcons[reqType]}
                      <span>{requestTypeLabels[reqType]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="targetDate">Data de Referência *</Label>
            <input type="date" id="targetDate" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="justification">Justificativa</Label>
            <Textarea id="justification" placeholder="Descreva o motivo da sua solicitação..." value={justification} onChange={(e) => setJustification(e.target.value)} rows={4} maxLength={500} />
            <span className="text-xs text-muted-foreground text-right">{justification.length}/500</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment">
              Anexar comprovante {requiresAttachment && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2 bg-muted/30 hover:border-primary transition-colors">
              <label htmlFor="attachment" className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground flex-1">
                <Paperclip size={18} />
                <span>{files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique para selecionar arquivos'}</span>
              </label>
              <input type="file" id="attachment" className="hidden" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} accept=".pdf,.jpg,.jpeg,.png" />
              {files.length > 0 && (
                <button type="button" className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => setFiles([])}>
                  <X size={12} />
                </button>
              )}
            </div>
            {files.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {files.map((f, i) => <div key={i}>📎 {f.name}</div>)}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
