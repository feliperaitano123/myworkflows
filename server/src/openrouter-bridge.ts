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
    sessionId: string,
    onToken?: (token: string) => void,
    model: string = 'anthropic/claude-3-haiku'
  ): Promise<string> {
    try {
      console.log(`🤖 OpenRouter Bridge - Processando mensagem: "${userMessage}"`);
      
      // Verificar se OpenRouter está configurado
      if (!this.apiKey) {
        console.log(`⚠️ OPENROUTER_API_KEY não configurada - usando resposta mock`);
        return await this.sendMockResponse(ws, userMessage, sessionId, onToken);
      }

      console.log(`🔑 Usando OpenRouter com chave: ${this.apiKey.substring(0, 20)}...`);
      
      // Tentar OpenRouter real
      try {
        return await this.processOpenRouterRequest(ws, userMessage, systemPrompt, sessionId, onToken, model);
      } catch (error) {
        console.log(`❌ OpenRouter falhou:`, error.message);
        console.log(`🔄 Usando mock como fallback`);
        return await this.sendMockResponse(ws, userMessage, sessionId, onToken);
      }

    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      
      const errorMessage: WSMessage = {
        type: 'error',
        error: 'Erro ao processar resposta do agente. Tente novamente.',
        sessionId
      };
      
      ws.send(JSON.stringify(errorMessage));
      return '';
    }
  }

  private async processOpenRouterRequest(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    sessionId: string,
    onToken?: (token: string) => void,
    model: string = 'anthropic/claude-3-haiku'
  ): Promise<string> {
    console.log(`🔑 Enviando para OpenRouter com modelo: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://myworkflows.ai',
        'X-Title': 'MyWorkflows AI Agent'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 OpenRouter Error ${response.status}:`, errorText);
      
      if (response.status === 401) {
        throw new Error(`Chave de API inválida ou expirada (401)`);
      } else if (response.status === 402) {
        throw new Error(`Saldo insuficiente na conta OpenRouter (402)`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit excedido (429)`);
      } else {
        throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      }
    }

    return await this.processStreamResponse(ws, response, sessionId, onToken);
  }

  private async processStreamResponse(
    ws: WebSocket,
    response: Response,
    sessionId: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    let fullResponse = '';

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
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                if (onToken) {
                  onToken(content);
                } else {
                  const tokenMessage: WSMessage = {
                    type: 'token',
                    content: content,
                    sessionId
                  };
                  ws.send(JSON.stringify(tokenMessage));
                }
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
    
    return fullResponse;
  }

  private async sendMockResponse(
    ws: WebSocket,
    userMessage: string,
    sessionId: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    const mockResponse = `Olá! Sou o agente de IA do MyWorkflows. Você disse: "${userMessage}". Esta é uma resposta simulada pois a chave da OpenRouter não está configurada. Configure OPENROUTER_API_KEY no arquivo .env para usar o agente real.`;
    
    // Simular streaming de tokens
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      const token = word + ' ';
      
      if (onToken) {
        onToken(token);
      } else {
        const tokenMessage: WSMessage = {
          type: 'token',
          content: token,
          sessionId
        };
        ws.send(JSON.stringify(tokenMessage));
      }
      
      // Pequeno delay para simular streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Enviar mensagem de conclusão
    const completeMessage: WSMessage = {
      type: 'complete',
      sessionId
    };
    
    console.log('🏁 Enviando mensagem de conclusão:', completeMessage);
    ws.send(JSON.stringify(completeMessage));
    console.log('✅ Mensagem de conclusão enviada!');
    
    return mockResponse;
  }
}