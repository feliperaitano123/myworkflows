
import React from 'react';
import { User, Clock, FileText, Play } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface UserMessageProps {
  content: string;
  timestamp: Date;
  formatTime: (date: Date) => string;
  attachments?: AttachmentItem[];
}

export const UserMessage: React.FC<UserMessageProps> = ({ 
  content, 
  timestamp, 
  formatTime,
  attachments 
}) => {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex gap-3 group">
        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <Clock className="h-3 w-3" />
              <span>{formatTime(timestamp)}</span>
            </div>
            <span className="text-sm font-medium">You</span>
            <CopyButton content={content} />
          </div>
          
          <div className="bg-primary text-primary-foreground rounded-lg p-4 relative">
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="mb-3 space-y-1">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-xs opacity-80">
                    {attachment.type === 'document' ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span>{attachment.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="whitespace-pre-wrap text-sm">
              {content}
            </div>
          </div>
        </div>
        
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
};
