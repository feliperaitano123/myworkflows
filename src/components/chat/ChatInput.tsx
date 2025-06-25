
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Plus, Mic, FileText, Play } from 'lucide-react';
import { AttachmentSheet } from './AttachmentSheet';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isLoading: boolean;
  selectedAttachments: AttachmentItem[];
  isAttachmentSheetOpen: boolean;
  setIsAttachmentSheetOpen: (open: boolean) => void;
  mockDocuments: AttachmentItem[];
  mockExecutions: AttachmentItem[];
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAttachmentSelect: (item: AttachmentItem) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  selectedModel,
  setSelectedModel,
  isLoading,
  selectedAttachments,
  isAttachmentSheetOpen,
  setIsAttachmentSheetOpen,
  mockDocuments,
  mockExecutions,
  onSendMessage,
  onKeyDown,
  onAttachmentSelect,
  onRemoveAttachment
}) => {
  return (
    <div className="border-t border-border p-4">
      <div className="space-y-3">
        {/* Selected Attachments */}
        {selectedAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAttachments.map((attachment) => (
              <div 
                key={attachment.id}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
              >
                {attachment.type === 'document' ? (
                  <FileText className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                <span>{attachment.name}</span>
                <button
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Container */}
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 border">
          {/* Add Context Button */}
          <AttachmentSheet
            isOpen={isAttachmentSheetOpen}
            onOpenChange={setIsAttachmentSheetOpen}
            onAttachmentSelect={onAttachmentSelect}
            mockDocuments={mockDocuments}
            mockExecutions={mockExecutions}
          />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 py-2 h-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add context</span>
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea 
              placeholder="Ask AI anything, @ to mention"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
              maxLength={2000}
            />
          </div>

          {/* Model Selection */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-32 h-8 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* OpenRouter Programming Models */}
              <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
              <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
              <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</SelectItem>
              <SelectItem value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</SelectItem>
              <SelectItem value="deepseek/deepseek-coder">DeepSeek Coder</SelectItem>
              <SelectItem value="microsoft/wizardcoder-34b">WizardCoder 34B</SelectItem>
            </SelectContent>
          </Select>

          {/* Mic Button */}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button 
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="h-8 w-8 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>Press Shift+Enter for new line</span>
          <span>{inputMessage.length}/2000</span>
        </div>
      </div>
    </div>
  );
};
