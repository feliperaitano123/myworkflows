import { register, Counter, Gauge, Histogram } from 'prom-client';

// Métricas de WebSocket
export const wsConnections = new Gauge({
  name: 'myworkflows_websocket_connections',
  help: 'Current number of WebSocket connections',
  labelNames: ['status']
});

export const wsMessages = new Counter({
  name: 'myworkflows_websocket_messages_total',
  help: 'Total WebSocket messages by type',
  labelNames: ['type', 'direction']
});

// Métricas de Chat
export const chatMessages = new Counter({
  name: 'myworkflows_chat_messages_total',
  help: 'Total chat messages processed',
  labelNames: ['role', 'model']
});

export const chatResponseTime = new Histogram({
  name: 'myworkflows_chat_response_duration_seconds',
  help: 'Chat response time in seconds',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

export const chatTokens = new Counter({
  name: 'myworkflows_chat_tokens_total',
  help: 'Total tokens used',
  labelNames: ['type', 'model'] // type: input/output
});

// Métricas de Tool Calls
export const toolCalls = new Counter({
  name: 'myworkflows_tool_calls_total',
  help: 'Total tool calls executed',
  labelNames: ['tool', 'status']
});

export const toolExecutionTime = new Histogram({
  name: 'myworkflows_tool_execution_duration_seconds',
  help: 'Tool execution time in seconds',
  labelNames: ['tool'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

// Métricas de Erro
export const errors = new Counter({
  name: 'myworkflows_errors_total',
  help: 'Total errors by type',
  labelNames: ['type', 'component']
});

// Métricas de Sistema
export const systemMetrics = new Gauge({
  name: 'myworkflows_system_metrics',
  help: 'System metrics',
  labelNames: ['metric']
});

// Função para atualizar métricas do sistema
export function updateSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  
  systemMetrics.set({ metric: 'memory_heap_used' }, memoryUsage.heapUsed);
  systemMetrics.set({ metric: 'memory_heap_total' }, memoryUsage.heapTotal);
  systemMetrics.set({ metric: 'memory_external' }, memoryUsage.external);
  systemMetrics.set({ metric: 'uptime' }, process.uptime());
}

// Atualizar métricas do sistema a cada 30 segundos
setInterval(updateSystemMetrics, 30000);

// Endpoint para expor métricas
export function getMetricsEndpoint() {
  return async (req: any, res: any) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  };
}

// Helper para tracking de resposta
export function trackChatResponse(model: string, responseTimeMs: number, inputTokens: number, outputTokens: number) {
  chatResponseTime.observe({ model }, responseTimeMs / 1000);
  chatTokens.inc({ type: 'input', model }, inputTokens);
  chatTokens.inc({ type: 'output', model }, outputTokens);
  chatMessages.inc({ role: 'assistant', model });
}