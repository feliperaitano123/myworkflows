import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { useChat } from '@/contexts/ChatContext';
import { useEffect, useRef, useState } from 'react';

interface ValidationStep {
  id: string;
  name: string;
  status: 'checking' | 'success' | 'error' | 'pending';
  message?: string;
  recommendation?: string;
}

interface ChatValidationStatus {
  isValid: boolean;
  workflowExists: boolean;
  websocketConnected: boolean;
  statusMessage: string;
  statusColor: 'green' | 'red' | 'yellow';
  isValidating: boolean;
  validationSteps: ValidationStep[];
  overallStatus: 'validating' | 'success' | 'error';
  showModal: boolean;
}

/**
 * Hook para validar se o chat pode ser utilizado
 * Combina validação de existência do workflow + conexão WebSocket
 */
export const useChatValidation = (workflowId: string): ChatValidationStatus => {
  const { getWorkflowStatus, isSyncing, workflows } = useWorkflowsContext();
  const { isConnected } = useChat();
  
  // Delay inicial para evitar modal prematuro (tanto no refresh quanto na mudança de workflow)
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    // Aguardar 2 segundos antes de permitir modais (tempo para sistema se estabilizar)
    setIsInitializing(true);
    
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [workflowId]); // Reset delay quando workflow muda

  // Converter System ID para n8n ID
  // workflowId é o System ID (UUID), mas getWorkflowStatus espera o n8n ID
  const currentWorkflow = workflows.find(w => w.id === workflowId);
  const n8nWorkflowId = currentWorkflow?.workflowId; // Este é o n8n ID
  
  
  const workflowStatus = n8nWorkflowId ? getWorkflowStatus(n8nWorkflowId) : 'unknown';
  const workflowExists = workflowStatus === 'exists';
  const websocketConnected = isConnected;
  const isValidating = isSyncing && workflowStatus === 'unknown';

  // Chat é válido apenas se workflow existe E WebSocket está conectado E não está validando
  const isValid = workflowExists && websocketConnected && !isValidating;

  // Construir steps de validação detalhados
  const validationSteps: ValidationStep[] = [
    {
      id: 'workflow-exists',
      name: 'Verificar existência do workflow',
      status: isValidating ? 'checking' : 
              workflowStatus === 'exists' ? 'success' : 
              workflowStatus === 'missing' ? 'error' : 'pending',
      message: workflowStatus === 'exists' ? 
               `Workflow "${currentWorkflow?.name}" encontrado no n8n` :
               workflowStatus === 'missing' ? 
               `Workflow "${currentWorkflow?.name}" não foi encontrado na instância n8n` :
               workflowStatus === 'unknown' ?
               'Aguardando verificação do workflow...' :
               'Status do workflow ainda não verificado',
      recommendation: workflowStatus === 'missing' ? 
                      'Verifique se o workflow ainda existe na sua instância n8n e se a conexão está ativa' :
                      undefined
    },
    {
      id: 'websocket-connection',
      name: 'Verificar conexão WebSocket',
      status: websocketConnected ? 'success' : 
              isValidating ? 'checking' : 'pending', // Não reportar erro por desconexão natural
      message: websocketConnected ? 
               'Conexão WebSocket estabelecida com sucesso' :
               isValidating ? 
               'Aguardando conexão WebSocket...' :
               'WebSocket desconectado (aguardando reconexão)',
      recommendation: undefined // Não mostrar recomendação para desconexões naturais
    },
    {
      id: 'connection-health',
      name: 'Verificar saúde da conexão n8n',
      status: !currentWorkflow ? (isValidating ? 'checking' : 'error') :
              currentWorkflow.connection?.active === false ? 'error' : 'success',
      message: !currentWorkflow ? 
               (isValidating ? 'Aguardando dados do workflow...' : 'Workflow não encontrado no sistema') :
               currentWorkflow.connection?.active === false ?
               'Conexão n8n está marcada como inativa' :
               'Conexão n8n está ativa e funcional',
      recommendation: !currentWorkflow && !isValidating ? 
                      'Verifique se o workflow foi importado corretamente' :
                      currentWorkflow?.connection?.active === false ?
                      'Vá para "Minhas Conexões" e verifique o status da sua conexão n8n' :
                      undefined
    }
  ];

  // Determinar status geral e se deve mostrar modal
  let overallStatus: 'validating' | 'success' | 'error';
  let showModal = false;

  const hasErrors = validationSteps.some(step => step.status === 'error');

  if (isValidating) {
    overallStatus = 'validating';
    showModal = false; // NÃO mostrar modal durante validação - usar loader do chat
  } else if (isValid) {
    overallStatus = 'success';
    showModal = false; // NÃO mostrar modal de sucesso - chat funciona normalmente
  } else if (hasErrors && !isValidating) {
    // APENAS mostrar modal quando há erros REAIS (após validação completa)
    // Só mostrar se não está validando E tem erro confirmado E passou do delay inicial
    const hasConfirmedError = workflowStatus === 'missing' ||
                             (currentWorkflow?.connection?.active === false);
    overallStatus = 'error';
    showModal = hasConfirmedError && !isInitializing; // Não mostrar modal durante delay inicial
  } else {
    overallStatus = 'error';
    showModal = false; // Estados intermediários não mostram modal
  }


  // Determinar mensagem e cor do status (para compatibilidade)
  let statusMessage: string;
  let statusColor: 'green' | 'red' | 'yellow';

  if (isValidating) {
    statusMessage = 'Verificando workflow...';
    statusColor = 'yellow';
  } else if (workflowStatus === 'missing') {
    statusMessage = 'Workflow não encontrado no n8n';
    statusColor = 'red';
  } else if (workflowStatus === 'unknown') {
    statusMessage = 'Status do workflow desconhecido';
    statusColor = 'yellow';
  } else if (!websocketConnected) {
    statusMessage = 'Chat desconectado - tentando reconectar...';
    statusColor = 'yellow';
  } else {
    statusMessage = 'Chat disponível';
    statusColor = 'green';
  }

  return {
    isValid,
    workflowExists,
    websocketConnected,
    statusMessage,
    statusColor,
    isValidating,
    validationSteps,
    overallStatus,
    showModal
  };
};