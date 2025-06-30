import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Plus, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from './ModelSelector';
import { ContextPopover, ContextItem } from './ContextPopover';
import { ContextTag } from './ContextTag';

interface ChatInputProps {
  onSend: (message: string, contexts?: ContextItem[]) => void;
  disabled?: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled,
  selectedModel,
  onModelChange
}) => {
  const [message, setMessage] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
  const [showContextPopover, setShowContextPopover] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim(), selectedContexts);
      setMessage('');
      setSelectedContexts([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '@' && !showContextPopover) {
      // Track cursor position for @ mentions
      setCursorPosition(e.currentTarget.selectionStart || 0);
      setShowContextPopover(true);
    }
  };

  const handleAddContext = (context: ContextItem) => {
    // Avoid duplicates
    if (!selectedContexts.find(c => c.id === context.id)) {
      setSelectedContexts(prev => [...prev, context]);
      
      // If triggered by @ symbol, replace it with the context mention
      if (cursorPosition > 0 && message.charAt(cursorPosition - 1) === '@') {
        const beforeCursor = message.slice(0, cursorPosition - 1);
        const afterCursor = message.slice(cursorPosition);
        const mentionText = `@${context.name}`;
        setMessage(beforeCursor + mentionText + afterCursor);
        
        // Move cursor after the mention
        setTimeout(() => {
          if (textareaRef.current) {
            const newCursorPos = beforeCursor.length + mentionText.length;
            textareaRef.current.selectionStart = newCursorPos;
            textareaRef.current.selectionEnd = newCursorPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    }
  };

  const handleRemoveContext = (contextId: string) => {
    setSelectedContexts(prev => prev.filter(c => c.id !== contextId));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    
    // Check for @ symbol to trigger context popover
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      setCursorPosition(cursorPos);
      setShowContextPopover(true);
    } else if (showContextPopover) {
      // Fechar popover se não estiver mais digitando após @
      const wordAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      if (lastAtSymbol === -1 || wordAfterAt.includes(' ')) {
        setShowContextPopover(false);
      }
    }
  };

  return (
    <div className="border-t bg-background">
      {/* Context tags row - only show when contexts exist */}
      {selectedContexts.length > 0 && (
        <div className="px-4 py-2 border-b">
          <div className="flex flex-wrap gap-2">
            {selectedContexts.map((context) => (
              <ContextTag
                key={context.id}
                context={context}
                onRemove={handleRemoveContext}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Main input area */}
      <div className="p-4">
        <div className="flex items-end gap-3 bg-muted/30 rounded-lg border p-3">
          {/* Add Context Button */}
          <ContextPopover
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <Plus className="w-4 h-4" />
              </Button>
            }
            onSelectContext={handleAddContext}
            open={showContextPopover}
            onOpenChange={setShowContextPopover}
          />
          
          {/* Text Input */}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask, learn, brainstorm"
              disabled={disabled}
              className="min-h-[24px] max-h-[120px] resize-none border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              rows={1}
            />
          </div>
          
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <ModelSelector
              value={selectedModel}
              onChange={onModelChange}
            />
          </div>
          
          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            size="sm"
            className="h-8 w-8 rounded-full p-0"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Footer text */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};