
import { useState } from 'react';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

export const useAttachments = () => {
  const [selectedAttachments, setSelectedAttachments] = useState<AttachmentItem[]>([]);
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false);

  const addAttachment = (item: AttachmentItem, inputMessage: string, setInputMessage: (message: string) => void) => {
    if (!selectedAttachments.find(att => att.id === item.id)) {
      setSelectedAttachments(prev => [...prev, item]);
      
      // Add attachment reference to input message
      const attachmentText = `[${item.name}]`;
      setInputMessage(inputMessage ? `${inputMessage} ${attachmentText}` : attachmentText);
    }
    setIsAttachmentSheetOpen(false);
  };

  const removeAttachment = (attachmentId: string, inputMessage: string, setInputMessage: (message: string) => void) => {
    const attachment = selectedAttachments.find(att => att.id === attachmentId);
    if (attachment) {
      setSelectedAttachments(prev => prev.filter(att => att.id !== attachmentId));
      
      // Remove attachment reference from input message
      const attachmentText = `[${attachment.name}]`;
      setInputMessage(inputMessage.replace(attachmentText, '').trim());
    }
  };

  const clearAttachments = () => {
    setSelectedAttachments([]);
  };

  return {
    selectedAttachments,
    isAttachmentSheetOpen,
    setIsAttachmentSheetOpen,
    addAttachment,
    removeAttachment,
    clearAttachments
  };
};
