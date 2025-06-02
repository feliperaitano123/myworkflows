
import React from 'react';
import { FileText, Play } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface AttachmentSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachmentSelect: (item: AttachmentItem) => void;
  mockDocuments: AttachmentItem[];
  mockExecutions: AttachmentItem[];
}

export const AttachmentSheet: React.FC<AttachmentSheetProps> = ({
  isOpen,
  onOpenChange,
  onAttachmentSelect,
  mockDocuments,
  mockExecutions
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>Attach Documents or Executions</SheetTitle>
          <SheetDescription>
            Select documents or workflow executions to attach to your message.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Documents Section */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </h4>
            <div className="space-y-2">
              {mockDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onAttachmentSelect(doc)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{doc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Executions Section */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Play className="h-4 w-4" />
              Executions
            </h4>
            <div className="space-y-2">
              {mockExecutions.map((execution) => (
                <button
                  key={execution.id}
                  onClick={() => onAttachmentSelect(execution)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Play className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{execution.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
