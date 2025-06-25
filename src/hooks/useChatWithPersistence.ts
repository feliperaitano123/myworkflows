
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAIAgent } from './useAIAgent';
import { useAIProcess } from './useAIProcess';
import { AIProcessMessage } from '@/types/ai-process';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'execution';
  }>;
  metadata?: any;
  processData?: AIProcessMessage; // Nova propriedade para dados do processo
}

export interface UseChatWithPersistenceOptions {
  workflowId?: string;
  wsUrl?: string;
}

export interface UseChatWithPersistenceReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  isLoadingHistory: boolean;
  currentResponse: string;
  connectionStatus: {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
  };
  sendMessage: (content: string, attachments?: any[], model?: string) => Promise<void>;
  clearChat: () => Promise<void>;
  error: string | null;
}

const WS_URL = 'ws://localhost:3001';

export const useChatWithPersistence = ({ 
  workflowId, 
  wsUrl = WS_URL 
}: UseChatWithPersistenceOptions): UseChatWithPersistenceReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Usar o hook base para WebSocket
  const { 
    isConnected, 
    isConnecting, 
    sendMessage: sendToAgent, 
    messages: wsMessages,
    currentResponse,
    error: wsError,
    clearMessages: clearWSMessages,
    clearCurrentResponse,
    socket
  } = useAIAgent({ url: wsUrl });

  // Hook para gerenciar processos da IA
  const {
    createProcess,
    addStep,
    updateStep,
    updateFinalResponse,
    completeProcess,
    getProcess,
    clearProcesses
  } = useAIProcess();

  const currentWorkflowId = useRef<string | undefined>(undefined);
  const currentProcessId = useRef<string | undefined>(undefined);

  // Converter mensagens do WebSocket para nosso formato
  const convertWSMessage = useCallback((wsMsg: any): ChatMessage => {
    return {
      id: wsMsg.id || Date.now().toString(),
      role: wsMsg.role || 'assistant',
      content: wsMsg.content || '',
      timestamp: new Date(wsMsg.created_at || Date.now()),
      metadata: wsMsg.metadata
    };
  }, []);

  // Carregar histórico quando workflowId muda
  useEffect(() => {
    if (workflowId && workflowId !== currentWorkflowId.current && isConnected) {
      console.log(`🎯 Workflow mudou de "${currentWorkflowId.current}" para "${workflowId}"`);
      loadChatHistory(workflowId);
      currentWorkflowId.current = workflowId;
    }
  }, [workflowId, isConnected]);

  // Corrigir loadChatHistory para enviar requisição real
  const loadChatHistory = async (targetWorkflowId: string) => {
    console.log(`📖 Iniciando loadChatHistory para: ${targetWorkflowId}`);
    console.log(`🔌 isConnected: ${isConnected}, socket: ${socket ? 'exists' : 'null'}`);
    
    if (!isConnected || !socket) {
      console.log('⏳ Aguardando conexão para carregar histórico...');
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    // Timeout de segurança - resetar loading após 10 segundos
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ Timeout do carregamento de histórico');
      setIsLoadingHistory(false);
      setError('Timeout ao carregar histórico. Tente novamente.');
    }, 10000);

    try {
      setMessages([]);
      // Enviar requisição real de histórico via WebSocket
      const historyRequest = {
        type: 'get_history',
        workflowId: targetWorkflowId,
        limit: 50
      };
      
      console.log(`📡 Socket readyState: ${socket.readyState} (1 = OPEN)`);
      
      // Usar socket unificado do useAIAgent
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(historyRequest));
        console.log(`📖 ✅ Histórico solicitado para workflow: ${targetWorkflowId}`);
        console.log(`📦 Requisição enviada:`, historyRequest);
      } else {
        console.warn('WebSocket não está aberto para histórico.');
        clearTimeout(loadingTimeout);
        setIsLoadingHistory(false);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico do chat');
      clearTimeout(loadingTimeout);
      setIsLoadingHistory(false);
    }
  };

  // Escutar mensagens especiais do WebSocket e processar novos tipos
  useEffect(() => {
    if (!wsMessages || wsMessages.length === 0) return;
    
    const latestMessage = wsMessages[wsMessages.length - 1];
    console.log('📨 Mensagem WebSocket recebida:', latestMessage);
    
    // Processar diferentes tipos de mensagem
    switch (latestMessage.type) {
      case 'token':
        // Token já está sendo processado pelo useAIAgent
        console.log('🔤 Token recebido, tamanho do currentResponse:', currentResponse.length);
        
        // Atualizar resposta final no processo ativo
        if (currentProcessId.current) {
          updateFinalResponse(currentProcessId.current, currentResponse + (latestMessage.content || ''));
        }
        break;

      case 'ai_thinking':
        console.log('🧠 IA iniciou processo de pensamento');
        const processId = createProcess(latestMessage.sessionId || '');
        currentProcessId.current = processId;
        
        addStep(processId, {
          type: 'thinking',
          status: 'in_progress',
          title: 'Analisando sua solicitação...',
          description: 'A IA está processando e entendendo o que você pediu'
        });
        break;

      case 'tool_start':
        console.log('🔧 Iniciando execução de ferramenta:', latestMessage.stepData);
        if (currentProcessId.current && latestMessage.stepData) {
          addStep(currentProcessId.current, {
            type: 'tool_execution',
            status: 'in_progress',
            title: latestMessage.stepData.title,
            description: latestMessage.stepData.description,
            toolName: latestMessage.stepData.toolName
          });
        }
        break;

      case 'tool_complete':
        console.log('✅ Ferramenta concluída:', latestMessage.stepData);
        if (currentProcessId.current && latestMessage.stepData) {
          addStep(currentProcessId.current, {
            type: 'tool_result',
            status: 'completed',
            title: 'Dados carregados com sucesso',
            description: 'As informações necessárias foram obtidas',
            content: latestMessage.content,
            toolName: latestMessage.stepData.toolName,
            duration: latestMessage.stepData.duration
          });
        }
        break;

      case 'ai_responding':
        console.log('🤖 IA iniciando resposta final');
        if (currentProcessId.current) {
          // Atualizar step de thinking para completo
          const process = getProcess(currentProcessId.current);
          if (process) {
            const thinkingStep = process.steps.find(s => s.type === 'thinking');
            if (thinkingStep) {
              updateStep(currentProcessId.current, thinkingStep.id, {
                status: 'completed',
                title: 'Análise concluída',
                description: 'Preparando resposta personalizada'
              });
            }
          }
        }
        break;

      case 'complete':
        console.log('✅ useChatWithPersistence: Streaming completo - processando resposta');
        if (currentResponse && currentResponse.trim() && currentProcessId.current) {
          // Completar o processo com a resposta final
          completeProcess(currentProcessId.current, currentResponse.trim());
          
          // Criar mensagem do assistente com dados do processo
          const process = getProcess(currentProcessId.current);
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: currentResponse.trim(),
            timestamp: new Date(),
            processData: process
          };
          
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && 
                lastMessage.content === assistantMessage.content) {
              console.log('⚠️ Mensagem duplicada detectada, não adicionando');
              return prev;
            }
            console.log('🤖 Adicionando mensagem do assistente com processo à UI');
            return [...prev, assistantMessage];
          });
          
          // Limpar referência do processo atual
          currentProcessId.current = undefined;
          clearCurrentResponse();
        }
        break;

      case 'history':
        console.log('📖 ✅ Histórico recebido:', latestMessage.history?.length || 0, 'mensagens');
        if (latestMessage.history && latestMessage.history.length > 0) {
          const historyMessages = latestMessage.history.map((msg: any) => convertWSMessage(msg));
          setMessages(historyMessages);
          console.log('📝 Mensagens de histórico carregadas:', historyMessages);
        } else {
          console.log('📭 Nenhuma mensagem no histórico');
          setMessages([]);
        }
        setIsLoadingHistory(false);
        break;
      
      case 'assistant_message':
        console.log('🤖 Assistant message recebida:', latestMessage);
        if (latestMessage.content && latestMessage.role === 'assistant') {
          const assistantMessage: ChatMessage = {
            id: latestMessage.messageId || `assistant_${Date.now()}_${Math.random()}`,
            role: 'assistant',
            content: latestMessage.content,
            timestamp: new Date(),
            metadata: {
              ...latestMessage.metadata,
              is_tool_call: latestMessage.metadata?.type === 'tool_call'
            }
          };
          
          setMessages(prev => {
            console.log(`🤖 Adicionando assistant message à UI: ${latestMessage.metadata?.type || 'normal'}`);
            return [...prev, assistantMessage];
          });
        }
        break;
      
      case 'tool_result':
        console.log('🔧 Tool result recebida:', latestMessage);
        if (latestMessage.content && latestMessage.role === 'tool') {
          const toolMessage: ChatMessage = {
            id: latestMessage.messageId || `tool_${Date.now()}_${Math.random()}`,
            role: 'tool',
            content: latestMessage.content,
            timestamp: new Date(),
            metadata: {
              ...latestMessage.metadata,
              is_tool_result: true
            }
          };
          
          setMessages(prev => {
            console.log(`🔧 Adicionando tool result à UI`);
            return [...prev, toolMessage];
          });
        }
        break;
      
      case 'tool_error':
        console.log('❌ Tool error recebida:', latestMessage);
        if (latestMessage.content && latestMessage.role === 'assistant') {
          const errorMessage: ChatMessage = {
            id: `error_${Date.now()}_${Math.random()}`,
            role: 'assistant',
            content: latestMessage.content,
            timestamp: new Date(),
            metadata: {
              ...latestMessage.metadata,
              is_tool_error: true
            }
          };
          
          setMessages(prev => {
            console.log(`❌ Adicionando tool error à UI`);
            return [...prev, errorMessage];
          });
        }
        break;
      
      case 'error':
        console.error('❌ Erro WebSocket:', latestMessage.error);
        const errorMsg = latestMessage.error || 'Erro desconhecido';
        
        // Marcar processo atual como erro se existir
        if (currentProcessId.current) {
          const process = getProcess(currentProcessId.current);
          if (process && process.steps.length > 0) {
            const lastStep = process.steps[process.steps.length - 1];
            updateStep(currentProcessId.current, lastStep.id, {
              status: 'error',
              title: 'Erro no processamento',
              description: errorMsg
            });
          }
          currentProcessId.current = undefined;
        }
        
        if (errorMsg.includes('401') || errorMsg.includes('OpenRouter')) {
          setError('Erro na API do OpenRouter. Verificando chave de API...');
        } else {
          setError(errorMsg);
        }
        setIsLoadingHistory(false);
        break;
    }
  }, [wsMessages, currentResponse, createProcess, addStep, updateStep, updateFinalResponse, completeProcess, getProcess, clearCurrentResponse]);

  const sendMessage = useCallback(async (
    content: string, 
    attachments?: any[],
    model?: string
  ) => {
    if (!content.trim()) return;
    if (!isConnected) {
      setError('Não conectado ao agente');
      return;
    }

    try {
      setError(null);

      // Adicionar mensagem do usuário imediatamente na UI
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        attachments
      };

      setMessages(prev => {
        console.log(`👤 useChatWithPersistence: Adicionando mensagem do usuário (${prev.length} → ${prev.length + 1})`);
        return [...prev, userMessage];
      });

      // Enviar para o agente via WebSocket
      console.log(`📤 useChatWithPersistence: Enviando para agente - workflowId: ${workflowId}, model: ${model}`);
      if (workflowId) {
        await sendToAgent(content, workflowId, model);
      } else {
        await sendToAgent(content, undefined, model);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem');
    }
  }, [isConnected, workflowId, sendToAgent]);

  const clearChat = useCallback(async () => {
    if (!workflowId) {
      setMessages([]);
      clearWSMessages();
      clearProcesses();
      return;
    }

    try {
      setError(null);
      setMessages([]);
      clearWSMessages();
      clearProcesses();
      currentProcessId.current = undefined;
      console.log(`🗑️ Chat limpo para workflow: ${workflowId}`);
    } catch (error) {
      console.error('❌ Erro ao limpar chat:', error);
      setError('Erro ao limpar chat');
    }
  }, [workflowId, clearWSMessages, clearProcesses]);

  // Atualizar mensagens quando receber resposta do agente
  useEffect(() => {
    if (currentResponse && currentResponse.length > 0) {
      // A resposta está sendo streamed
      // Não fazemos nada aqui, o streaming é mostrado em tempo real
    }
  }, [currentResponse]);

  // Adicionar resposta completa quando streaming terminar
  // (implementado no listener de wsMessages acima)

  const connectionStatus = {
    isConnected,
    isConnecting,
    error: wsError
  };

  return {
    messages,
    isConnected,
    isConnecting,
    isLoadingHistory,
    currentResponse,
    connectionStatus,
    sendMessage,
    clearChat,
    error: error || wsError
  };
};

export const useChatMessages = useChatWithPersistence;
