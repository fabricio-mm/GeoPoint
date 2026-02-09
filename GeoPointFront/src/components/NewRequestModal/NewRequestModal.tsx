import React, { useState } from 'react';
import { FileText, Calendar, Clock, Paperclip, X } from 'lucide-react';
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
import { requestsApi, attachmentsApi, RequestType, RequestStatus } from '@/services/api';
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

const requestTypeLabels: Record<RequestType, string> = {
  1: 'Esquecimento de Ponto',
  2: 'Atestado Médico',
  3: 'Férias',
};

const requestTypeIcons: Record<RequestType, React.ReactNode> = {
  1: <Clock size={16} />,
  2: <FileText size={16} />,
  3: <Calendar size={16} />,
};

const requestTypes: RequestType[] = [1, 2, 3];

export default function NewRequestModal({ isOpen, onClose, onSubmit, userId }: NewRequestModalProps) {
  const [type, setType] = useState<RequestType | null>(null);
  const [justification, setJustification] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const resetForm = () => {
    setType(null);
    setJustification('');
    setTargetDate('');
    setFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === null) {
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
      });

      if (file) {
        try {
          await attachmentsApi.upload(file, result.id);
        } catch (uploadErr) {
          console.error('Error uploading attachment:', uploadErr);
          toast.error('Solicitação criada, mas erro ao anexar arquivo');
        }
      }

      const displayRequest: DisplayRequest = {
        id: result.id,
        type: result.type,
        status: 0 as RequestStatus, // Always PENDING on creation
        description: result.justificationUser,
        containsProof: !!file || result.containsProof,
        createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
      };

      onSubmit(displayRequest);
      resetForm();
      toast.success('Solicitação enviada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Error creating request:', err);
      toast.error('Erro ao enviar solicitação');
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
            <Select
              value={type !== null ? String(type) : ''}
              onValueChange={(value) => setType(Number(value) as RequestType)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
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
            <Label htmlFor="targetDate">Data de Referência</Label>
            <input
              type="date"
              id="targetDate"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              placeholder="Descreva o motivo da sua solicitação..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <span className="text-xs text-muted-foreground text-right">{justification.length}/500</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment">Anexar comprovante</Label>
            <div className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2 bg-muted/30 hover:border-primary transition-colors">
              <label htmlFor="attachment" className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground flex-1">
                <Paperclip size={18} />
                <span>{file ? file.name : 'Clique para selecionar um arquivo'}</span>
              </label>
              <input
                type="file"
                id="attachment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {file && (
                <button
                  type="button"
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground"
                  onClick={() => setFile(null)}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
