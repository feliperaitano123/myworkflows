
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflows } from '@/contexts/WorkflowContext';
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  Loader2,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WorkflowChat: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows, selectedWorkflow, setSelectedWorkflow } = useWorkflows();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find current workflow
  const currentWorkflow = workflows.find(w => w.id === workflowId);

  useEffect(() => {
    if (currentWorkflow && currentWorkflow.id !== selectedWorkflow?.id) {
      setSelectedWorkflow(currentWorkflow);
    }
  }, [currentWorkflow, selectedWorkflow, setSelectedWorkflow]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're working with the "${currentWorkflow?.name}" workflow. Here's how I can help you with that automation: \n\nThis workflow specializes in ${currentWorkflow?.description}. What specific aspect would you like to know more about or modify?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Workflow Not Found</h3>
            <p className="text-muted-foreground">The requested workflow could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        title={currentWorkflow.name}
        subtitle="AI-powered workflow conversation"
        actionButton={{
          label: "Settings",
          icon: SettingsIcon,
          onClick: () => console.log('Workflow settings'),
          variant: 'secondary'
        }}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Start a Conversation</h3>
                <p className="text-muted-foreground">
                  Ask questions or give instructions about your "{currentWorkflow.name}" workflow.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInputMessage("How does this workflow work?")}
                >
                  How does this work?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInputMessage("What can I modify in this workflow?")}
                >
                  What can I modify?
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={cn(
                  'max-w-[80%] rounded-lg p-4',
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'bg-muted mr-12'
                )}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4" />
                      <span className="text-xs font-medium">AI Assistant</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 mr-12">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs font-medium">AI Assistant is typing</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-6">
        <div className="space-y-4">
          {/* Model Selection */}
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">Model:</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3">Claude 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Input */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Textarea 
                  placeholder="Type your message here..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[200px] resize-none pr-12"
                  maxLength={2000}
                />
                <Button 
                  size="sm"
                  className="absolute bottom-2 right-2 h-8 w-8 p-0"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Character count and shortcuts */}
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Press Shift+Enter for new line</span>
                <span>{inputMessage.length}/2000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowChat;
