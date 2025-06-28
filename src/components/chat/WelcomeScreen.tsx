import React from 'react';
import { Sparkles, Workflow, Code, Bug } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const suggestions = [
    {
      icon: <Workflow className="w-4 h-4" />,
      text: "Me mostre os detalhes deste workflow"
    },
    {
      icon: <Code className="w-4 h-4" />,
      text: "Como posso adicionar um webhook trigger?"
    },
    {
      icon: <Bug className="w-4 h-4" />,
      text: "Ajude-me a debugar este workflow"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
      <div className="bg-primary/10 p-4 rounded-full mb-6">
        <Sparkles className="w-12 h-12 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-3">
        Assistente de Workflow n8n
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Olá! Sou seu assistente especializado em n8n. 
        Posso ajudar você a entender, criar e otimizar seus workflows.
      </p>
      
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Sugestões para começar:
        </p>
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer text-left"
          >
            <div className="text-muted-foreground">{suggestion.icon}</div>
            <span className="text-sm">{suggestion.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};