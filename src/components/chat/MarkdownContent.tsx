import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ 
  content, 
  className 
}) => {
  // Por enquanto renderizar como texto simples
  // TODO: Implementar markdown real mais tarde
  return (
    <div className={`bg-transparent ${className || ''}`}>
      <pre className="whitespace-pre-wrap font-sans break-words bg-transparent text-foreground">
        {content}
      </pre>
    </div>
  );
};