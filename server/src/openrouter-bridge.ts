import WebSocket from 'ws';
import { WSMessage } from './types/agent';

export class OpenRouterBridge {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENROUTER_API_KEY not configured - using mock responses');
    }
  }

  async streamResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      if (!this.apiKey) {
        // Mock response para desenvolvimento
        await this.sendMockResponse(ws, userMessage, sessionId);
        return;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://myworkflows.ai',
          'X-Title': 'MyWorkflows AI Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          stream: true,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      await this.processStreamResponse(ws, response, sessionId);

    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      
      const errorMessage: WSMessage = {
        type: 'error',
        error: 'Erro ao processar resposta do agente. Tente novamente.',
        sessionId
      };
      
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async processStreamResponse(
    ws: WebSocket,
    response: Response,
    sessionId: string
  ): Promise<void> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              const completeMessage: WSMessage = {
                type: 'complete',
                sessionId
              };
              ws.send(JSON.stringify(completeMessage));
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                const tokenMessage: WSMessage = {
                  type: 'token',
                  content: content,
                  sessionId
                };
                ws.send(JSON.stringify(tokenMessage));
              }
            } catch (parseError) {
              // Ignore parsing errors for invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async sendMockResponse(
    ws: WebSocket,
    userMessage: string,
    sessionId: string
  ): Promise<void> {
    const mockResponse = `Olá! Sou o agente de IA do MyWorkflows. Você disse: "${userMessage}". Esta é uma resposta simulada pois a chave da OpenRouter não está configurada. Configure OPENROUTER_API_KEY no arquivo .env para usar o agente real.`;
    
    // Simular streaming de tokens
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      const tokenMessage: WSMessage = {
        type: 'token',
        content: word + ' ',
        sessionId
      };
      
      ws.send(JSON.stringify(tokenMessage));
      
      // Pequeno delay para simular streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Enviar mensagem de conclusão
    const completeMessage: WSMessage = {
      type: 'complete',
      sessionId
    };
    
    ws.send(JSON.stringify(completeMessage));
  }
}