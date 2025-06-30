// TODO: Instalar prom-client para métricas
// Monitoring desabilitado temporariamente

// Placeholders para métricas
export const wsConnections = { set: () => {}, inc: () => {}, dec: () => {} };
export const wsMessages = { inc: () => {} };
export const chatMessages = { inc: () => {} };
export const chatResponseTime = { observe: () => {} };
export const chatTokens = { inc: () => {} };
export const toolCalls = { inc: () => {} };
export const toolExecutionTime = { observe: () => {} };
export const errors = { inc: () => {} };
export const systemMetrics = { set: () => {} };

export function updateSystemMetrics() {
  // Desabilitado temporariamente
}

export function getMetricsEndpoint() {
  return async (req: any, res: any) => {
    res.json({ message: 'Metrics temporarily disabled' });
  };
}

export function trackChatResponse(model: string, responseTimeMs: number, inputTokens: number, outputTokens: number) {
  // Desabilitado temporariamente
}