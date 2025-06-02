
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  workflowName: string;
  onSuggestedMessage: (message: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ workflowName, onSuggestedMessage }) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Start a Conversation</h3>
          <p className="text-muted-foreground">
            Ask questions or give instructions about your "{workflowName}" workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSuggestedMessage("How does this workflow work?")}
          >
            How does this work?
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSuggestedMessage("What can I modify in this workflow?")}
          >
            What can I modify?
          </Button>
        </div>
      </div>
    </div>
  );
};
