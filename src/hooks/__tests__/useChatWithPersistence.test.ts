import { renderHook, act } from '@testing-library/react-hooks';
import { useChatWithPersistence } from '../useChatWithPersistence-v2';

// Mock do WebSocket
class MockWebSocket {
  readyState = WebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Mock do supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ 
        data: { 
          session: { 
            access_token: 'mock-token',
            user: { id: 'mock-user-id' }
          } 
        } 
      })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
          order: () => Promise.resolve({ data: [] })
        })
      })
    })
  }
}));

// Mock do contexto de auth
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'mock-user-id' } })
}));

global.WebSocket = MockWebSocket as any;

describe('useChatWithPersistence', () => {
  it('should not duplicate messages when transitioning from streaming to saved', async () => {
    const { result } = renderHook(() => 
      useChatWithPersistence('workflow-123')
    );

    // Simular conexão WebSocket
    const ws = (global as any).WebSocket.mock.instances[0];
    act(() => {
      ws.onopen();
    });

    // Simular streaming
    act(() => {
      ws.onmessage(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'token',
          messageId: 'msg-1',
          content: 'Hello'
        })
      }));
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isStreaming).toBe(true);

    // Simular salvamento
    act(() => {
      ws.onmessage(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'message_saved',
          message: {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello world!',
            metadata: {}
          }
        })
      }));
    });

    // Verificar que não duplicou
    const nonToolMessages = result.current.messages.filter(m => m.role !== 'tool');
    expect(nonToolMessages).toHaveLength(1);
    expect(nonToolMessages[0].isStreaming).toBe(false);
  });
});