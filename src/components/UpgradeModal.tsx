import { Clock, Link, GitBranch, Lock, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';

type UpgradeTrigger = 'daily_limit' | 'connection_limit' | 'workflow_limit' | 'feature_locked';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: UpgradeTrigger;
  context?: {
    current?: number;
    feature?: string;
  };
}

export const UpgradeModal = ({ isOpen, onClose, trigger, context }: UpgradeModalProps) => {
  const { createCheckoutSession, isLoading } = useStripeCheckout();

  const content = {
    daily_limit: {
      title: "Limite Diário Atingido",
      description: "Você usou suas 5 interações diárias. Faça upgrade para o Pro e tenha 500 créditos mensais!",
      icon: <Clock className="w-12 h-12 text-orange-500" />,
      benefits: [
        "500 Créditos AI mensais (~150-500 interações)",
        "Use qualquer modelo AI sem restrições",
        "3 conexões n8n",
        "Workflows ilimitados",
        "Histórico de 6 meses"
      ]
    },
    connection_limit: {
      title: "Limite de Conexões Atingido",
      description: "O plano Free permite 1 conexão n8n. Faça upgrade para conectar até 3 instâncias!",
      icon: <Link className="w-12 h-12 text-blue-500" />,
      benefits: [
        "Conecte até 3 instâncias n8n",
        "Alterne entre ambientes facilmente",
        "Gerencie produção e desenvolvimento",
        "Sincronização completa de workflows"
      ]
    },
    workflow_limit: {
      title: "Limite de Workflows Atingido",
      description: `Você tem ${context?.current || 3} workflows. Faça upgrade para workflows ilimitados!`,
      icon: <GitBranch className="w-12 h-12 text-purple-500" />,
      benefits: [
        "Workflows ilimitados por conexão",
        "Sem restrições de complexidade",
        "Analytics avançados de workflows",
        "Suporte prioritário"
      ]
    },
    feature_locked: {
      title: "Feature Pro",
      description: "Esta funcionalidade está disponível apenas para usuários Pro.",
      icon: <Lock className="w-12 h-12 text-gray-500" />,
      benefits: [
        "Exportar histórico de chat",
        "Analytics avançados",
        "Suporte prioritário",
        "Acesso antecipado a novas features"
      ]
    }
  };

  const data = content[trigger];

  const handleUpgrade = async () => {
    await createCheckoutSession('pro');
  };

  const getActionText = () => {
    switch (trigger) {
      case 'daily_limit':
        return 'Esperar até amanhã';
      case 'connection_limit':
      case 'workflow_limit':
        return 'Continuar com limitações';
      case 'feature_locked':
        return 'Talvez mais tarde';
      default:
        return 'Fechar';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center space-y-4">
          {data.icon}
          
          <DialogHeader>
            <DialogTitle className="text-xl">{data.title}</DialogTitle>
            <DialogDescription className="text-base">
              {data.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-left">Benefícios do Plano Pro:</h4>
            <ul className="space-y-2 text-sm text-left">
              {data.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col w-full gap-3">
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Upgrade para Pro - $20/mês
            </Button>
            
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              {getActionText()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};