import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROGRAMMING_MODELS = [
  { 
    value: 'anthropic/claude-3-haiku', 
    label: 'Claude 3 Haiku',
    description: 'Rápido e eficiente'
  },
  { 
    value: 'anthropic/claude-3.5-sonnet', 
    label: 'Claude 3.5 Sonnet',
    description: 'Equilibrado - recomendado'
  },
  { 
    value: 'openai/gpt-4o-mini', 
    label: 'GPT-4o Mini',
    description: 'Rápido da OpenAI'
  },
  { 
    value: 'openai/gpt-4o', 
    label: 'GPT-4o',
    description: 'Mais avançado da OpenAI'
  },
  { 
    value: 'meta-llama/llama-3.1-70b-instruct', 
    label: 'Llama 3.1 70B',
    description: 'Open source poderoso'
  },
  { 
    value: 'deepseek/deepseek-coder', 
    label: 'DeepSeek Coder',
    description: 'Especializado em código'
  },
  { 
    value: 'microsoft/wizardcoder-2-8x22b', 
    label: 'WizardCoder 2',
    description: 'Especialista em programação'
  }
];

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange
}) => {
  const selectedModel = PROGRAMMING_MODELS.find(m => m.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[80px] border-0 bg-transparent px-2 text-xs font-medium">
        <SelectValue>
          <span className="text-xs font-medium">{selectedModel?.label || 'Auto'}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROGRAMMING_MODELS.map(model => (
          <SelectItem key={model.value} value={model.value}>
            <div className="flex flex-col items-start">
              <span className="font-medium">{model.label}</span>
              <span className="text-xs text-muted-foreground">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};