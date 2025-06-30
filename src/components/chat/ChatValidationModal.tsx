import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  RefreshCw,
  Bug,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationStep {
  id: string;
  name: string;
  status: 'checking' | 'success' | 'error' | 'pending';
  message?: string;
  recommendation?: string;
}

interface ChatValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  isValidating: boolean;
  workflowName: string;
  validationSteps: ValidationStep[];
  overallStatus: 'validating' | 'success' | 'error';
}

export const ChatValidationModal: React.FC<ChatValidationModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  isValidating,
  workflowName,
  validationSteps,
  overallStatus
}) => {
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState('');

  const getStatusIcon = (status: ValidationStep['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: ValidationStep['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700">Verificando</Badge>;
      case 'success':
        return <Badge variant="secondary" className="bg-green-50 text-green-700">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Falha</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const hasErrors = validationSteps.some(step => step.status === 'error');
  const allCompleted = validationSteps.every(step => step.status === 'success' || step.status === 'error');

  const handleBugReport = () => {
    // Aqui seria a integração com o sistema de bug report
    console.log('Bug Report:', {
      workflow: workflowName,
      description: bugDescription,
      validationSteps: validationSteps,
      timestamp: new Date().toISOString()
    });
    setShowBugReport(false);
    setBugDescription('');
  };

  const getModalTitle = () => {
    if (overallStatus === 'validating') {
      return 'Verificando Conexão do Chat';
    } else if (overallStatus === 'success') {
      return 'Chat Disponível';
    } else {
      return 'Problemas na Conexão do Chat';
    }
  };

  const getModalDescription = () => {
    if (overallStatus === 'validating') {
      return `Verificando se o workflow "${workflowName}" está acessível e pronto para chat...`;
    } else if (overallStatus === 'success') {
      return `O workflow "${workflowName}" foi verificado com sucesso e está pronto para chat.`;
    } else {
      return `Encontramos alguns problemas ao verificar o workflow "${workflowName}". Verifique os detalhes abaixo.`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {overallStatus === 'validating' && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
            {overallStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {overallStatus === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Steps */}
          <div className="space-y-3">
            {validationSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(step.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{step.name}</span>
                    {getStatusBadge(step.status)}
                  </div>
                  
                  {step.message && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {step.message}
                    </p>
                  )}
                  
                  {step.status === 'error' && step.recommendation && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                      <p className="text-sm text-amber-800">
                        <strong>Recomendação:</strong> {step.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bug Report Section */}
          {showBugReport && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <Label className="font-medium">Reportar Problema</Label>
              </div>
              <Textarea
                placeholder="Descreva o problema que você está enfrentando..."
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                className="min-h-[80px] mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBugReport(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleBugReport}
                  disabled={!bugDescription.trim()}
                >
                  Enviar Report
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {overallStatus === 'error' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowBugReport(true)}
                className="flex items-center gap-2"
                disabled={showBugReport}
              >
                <Bug className="w-4 h-4" />
                Reportar Bug
              </Button>
              <Button
                onClick={onRetry}
                disabled={isValidating}
                className="flex items-center gap-2"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Tentar Novamente
              </Button>
            </>
          )}
          
          {overallStatus === 'success' && (
            <Button onClick={onClose} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Continuar
            </Button>
          )}
          
          {overallStatus === 'validating' && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};