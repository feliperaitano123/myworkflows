import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { useChat } from '@/contexts/ChatContext';
import { useState, useEffect } from 'react';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Converter System ID para n8n ID
  // workflowId é o System ID (UUID), mas getWorkflowStatus espera o n8n ID
  const currentWorkflow = workflows.find(w => w.id === workflowId);
  const n8nWorkflowId = currentWorkflow?.workflowId; // Este é o n8n ID
  
  console.log(`🔧 useChatValidation ID mapping:`);
  console.log(`   System ID (input): ${workflowId}`);
  console.log(`   Found workflow:`, currentWorkflow ? 'YES' : 'NO');
  console.log(`   n8n ID (mapped): ${n8nWorkflowId}`);
  
  const workflowStatus = n8nWorkflowId ? getWorkflowStatus(n8nWorkflowId) : 'unknown';
  console.log(`   Final status: ${workflowStatus}`);
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
      status: websocketConnected ? 'success' : 'error',
      message: websocketConnected ? 
               'Conexão WebSocket estabelecida com sucesso' :
               'Falha na conexão WebSocket com o servidor de chat',
      recommendation: !websocketConnected ? 
                      'Verifique sua conexão com a internet e tente recarregar a página' :
                      undefined
    },
    {
      id: 'connection-health',
      name: 'Verificar saúde da conexão n8n',
      status: !currentWorkflow ? 'error' :
              currentWorkflow.connection?.active === false ? 'error' : 'success',
      message: !currentWorkflow ? 
               'Workflow não encontrado no sistema' :
               currentWorkflow.connection?.active === false ?
               'Conexão n8n está marcada como inativa' :
               'Conexão n8n está ativa e funcional',
      recommendation: !currentWorkflow ? 
                      'Verifique se o workflow foi importado corretamente' :
                      currentWorkflow.connection?.active === false ?
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
    showModal = true; // Sempre mostrar modal durante validação
  } else if (isValid) {
    overallStatus = 'success';
    showModal = showSuccessModal; // Mostrar modal de sucesso temporariamente
  } else if (hasErrors) {
    overallStatus = 'error';
    showModal = true; // Mostrar modal quando há erros
  } else {
    overallStatus = 'error';
    showModal = false; // Estados intermediários não mostram modal
  }

  // Efeito para mostrar modal de sucesso temporariamente
  useEffect(() => {
    if (isValid && !isValidating) {
      setShowSuccessModal(true);
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000); // Fechar após 2 segundos
      
      return () => clearTimeout(timer);
    }
  }, [isValid, isValidating]);

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