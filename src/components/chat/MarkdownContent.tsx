import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  
  return (
    <div className="relative group my-4">
      <div className="bg-muted rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase">
            {language || 'code'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
            title="Copiar código"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-transparent text-foreground overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const parseContent = (content: string) => {
  const parts = [];
  let currentIndex = 0;
  
  // Regex para detectar blocos de código com ```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  // Regex para detectar JSON (objetos que começam com { e terminam com })
  const jsonRegex = /(\{[\s\S]*?\})/g;
  
  let match;
  
  // Processar blocos de código primeiro
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Adicionar texto antes do bloco
    if (match.index > currentIndex) {
      const textBefore = content.slice(currentIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Adicionar bloco de código
    parts.push({ 
      type: 'code', 
      content: match[2], 
      language: match[1] || 'text' 
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  // Processar o resto do texto para JSON
  const remainingText = content.slice(currentIndex);
  if (remainingText.trim()) {
    let jsonCurrentIndex = 0;
    
    while ((match = jsonRegex.exec(remainingText)) !== null) {
      // Adicionar texto antes do JSON
      if (match.index > jsonCurrentIndex) {
        const textBefore = remainingText.slice(jsonCurrentIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }
      
      // Verificar se parece ser JSON válido
      try {
        JSON.parse(match[1]);
        parts.push({ 
          type: 'code', 
          content: JSON.stringify(JSON.parse(match[1]), null, 2), 
          language: 'json' 
        });
      } catch {
        // Se não for JSON válido, tratar como texto
        parts.push({ type: 'text', content: match[1] });
      }
      
      jsonCurrentIndex = match.index + match[0].length;
    }
    
    // Adicionar texto restante
    const finalText = remainingText.slice(jsonCurrentIndex);
    if (finalText.trim()) {
      parts.push({ type: 'text', content: finalText });
    }
  }
  
  // Se não encontrou nenhum código ou JSON, retornar todo o conteúdo como texto
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  return parts;
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ 
  content, 
  className 
}) => {
  const parts = parseContent(content);
  
  return (
    <div className={`bg-transparent ${className || ''}`}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock 
              key={index} 
              code={part.content} 
              language={part.language} 
            />
          );
        } else {
          return (
            <div key={index} className="whitespace-pre-wrap font-sans break-words text-foreground">
              {part.content}
            </div>
          );
        }
      })}
    </div>
  );
};