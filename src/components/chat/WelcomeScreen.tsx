import React, { useState } from 'react';
import { Plus, Search, BookOpen, Settings, Workflow, Webhook, Bug, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WelcomeScreenProps {
  onSuggestionClick?: (suggestion: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('analisar');
  
  // Extrair primeiro nome do usuário
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'usuário';

  // Ações rápidas contextuais para workflows n8n (Analisar primeiro)
  const quickActions = [
    { icon: <Search className="w-4 h-4" />, label: "Analisar", category: "analisar" },
    { icon: <Plus className="w-4 h-4" />, label: "Criar", category: "criar" },
    { icon: <BookOpen className="w-4 h-4" />, label: "Aprender", category: "aprender" },
    { icon: <Settings className="w-4 h-4" />, label: "Otimizar", category: "otimizar" }
  ];

  // Sugestões organizadas por categoria (4 por categoria)
  const suggestionsByCategory = {
    analisar: [
      "Me mostre os detalhes e funcionalidades deste workflow",
      "Analise este workflow e identifique possíveis melhorias",
      "Quais são os pontos fortes e fracos deste workflow?",
      "Este workflow está seguindo as melhores práticas?"
    ],
    criar: [
      "Como criar um novo workflow do zero no n8n?",
      "Me ajude a planejar um workflow para automatizar emails",
      "Como configurar um webhook trigger para receber dados?",
      "Quais nodes devo usar para integrar com APIs REST?"
    ],
    aprender: [
      "Me ensine sobre as melhores práticas para workflows n8n",
      "Como funciona o sistema de tratamento de erros no n8n?",
      "Explique os diferentes tipos de triggers disponíveis",
      "Quais são os nodes mais importantes para dominar?"
    ],
    otimizar: [
      "Como posso otimizar a performance deste workflow?",
      "Como reduzir o tempo de execução dos meus workflows?",
      "Quais são as práticas para workflows com muitos dados?",
      "Como implementar retry e tratamento de falhas?"
    ]
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  // Sugestões da categoria ativa
  const currentSuggestions = suggestionsByCategory[activeCategory as keyof typeof suggestionsByCategory] || [];

  return (
    <div className="flex flex-col justify-center h-full max-w-2xl mx-auto px-6 animate-in fade-in duration-500">
      {/* Saudação personalizada */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          Hey <span className="text-primary">{firstName}</span>, what's on your mind today?
        </h2>
      </div>

      {/* Botões de ação rápida horizontais */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleCategoryChange(action.category)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
              activeCategory === action.category
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card hover:bg-muted/50 border-border'
            }`}
          >
            <span className={activeCategory === action.category ? 'text-primary-foreground' : 'text-muted-foreground'}>
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Lista de sugestões filtradas por categoria */}
      <div className="w-full flex flex-col space-y-3">
        {currentSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="block w-full max-w-xl text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-3 border-b border-border/30 last:border-b-0 rounded-md"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};