import React from 'react';
import { Sparkles } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Sparkles className="w-12 h-12 text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-2">
        Assistente de Workflow
      </h2>
      <p className="text-muted-foreground max-w-md">
        Olá! Sou seu assistente especializado em n8n. 
        Posso ajudar você a criar, editar e otimizar seus workflows.
      </p>
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>Experimente perguntar:</p>
        <ul className="space-y-1">
          <li>"Como está configurado este workflow?"</li>
          <li>"Adicione um nó de webhook"</li>
          <li>"Encontre erros neste workflow"</li>
        </ul>
      </div>
    </div>
  );
};