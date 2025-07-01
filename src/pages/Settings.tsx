
import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LogOut, Save, CreditCard, ExternalLink, Zap, Clock } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const [searchParams] = useSearchParams();
  const { profile, isPro, isActive } = useUserProfile();
  const { limits, isPro: isProFromLimits } = useRateLimit();
  const { createCheckoutSession, openCustomerPortal, isLoading } = useStripeCheckout();
  
  // Get tab from URL or default to 'account'
  const defaultTab = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  
  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Seu plano foi atualizado. Pode levar alguns instantes para refletir as mudanças.",
      });
      // Remove success param from URL
      searchParams.delete('success');
      window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: "Pagamento cancelado",
        description: "O processo de upgrade foi cancelado.",
        variant: "destructive"
      });
      // Remove canceled param from URL
      searchParams.delete('canceled');
      window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
    }
  }, [searchParams]);

  const handleSaveChanges = () => {
    console.log('Saving changes...');
  };

  const handleLogout = () => {
    console.log('Logging out...');
  };

  const handleUpgrade = () => {
    createCheckoutSession('pro');
  };

  const handleManageBilling = () => {
    openCustomerPortal();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Settings"
        subtitle="Manage your account, billing, and preferences"
        actionButton={{
          label: 'Save Changes',
          icon: Save,
          onClick: handleSaveChanges
        }}
      />
      
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" defaultValue="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue="john@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" defaultValue="Acme Corp" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input id="timezone" defaultValue="UTC-3 (São Paulo)" />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-4">Preferences</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive email updates about your workflows</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Default AI Model</Label>
                        <p className="text-sm text-muted-foreground">Choose your preferred AI model</p>
                      </div>
                      <Badge variant="secondary">GPT-4</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="billing" className="space-y-6">
            {/* Current Plan Card */}
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Plano Atual</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-lg">
                          {isPro ? 'Pro' : 'Free'} Plan
                        </h4>
                        {isPro && <Badge className="bg-gradient-to-r from-blue-600 to-purple-600">Ativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isPro 
                          ? `${limits?.monthly_credits_limit || 500} créditos AI por mês`
                          : '5 interações por dia'
                        }
                      </p>
                    </div>
                    
                    {isPro ? (
                      <Button 
                        onClick={handleManageBilling}
                        disabled={isLoading}
                        variant="outline"
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Gerenciar Assinatura
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleUpgrade}
                        disabled={isLoading}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <CreditCard className="w-4 h-4" />
                        Upgrade para Pro
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Usage This Period */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    {isPro ? <Zap className="w-4 h-4 text-blue-500" /> : <Clock className="w-4 h-4 text-gray-500" />}
                    Uso no Período
                  </h4>
                  
                  {limits ? (
                    <div className="space-y-3">
                      {isPro ? (
                        // Pro Plan Usage
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Créditos Usados</span>
                            <span>
                              {limits.monthly_credits_used.toLocaleString()} / {limits.monthly_credits_limit.toLocaleString()}
                            </span>
                          </div>
                          <Progress 
                            value={(limits.monthly_credits_used / limits.monthly_credits_limit) * 100} 
                            className="h-2" 
                          />
                          <p className="text-xs text-muted-foreground">
                            Uso reseta mensalmente
                          </p>
                        </>
                      ) : (
                        // Free Plan Usage
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Interações Hoje</span>
                            <span>{limits.daily_interactions} / 5</span>
                          </div>
                          <Progress 
                            value={(limits.daily_interactions / 5) * 100} 
                            className="h-2" 
                          />
                          <p className="text-xs text-muted-foreground">
                            Uso reseta a cada 24 horas após primeira interação
                          </p>
                        </>
                      )}
                      
                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-muted-foreground">Total de Interações</p>
                          <p className="text-lg font-semibold">{limits.total_interactions.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-muted-foreground">Tokens Totais</p>
                          <p className="text-lg font-semibold">{limits.total_tokens_used.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-gray-300 h-4 w-4"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Plan Comparison (only for Free users) */}
                {!isPro && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-4">Compare Planos</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Free Plan */}
                        <div className="border rounded-lg p-4">
                          <div className="text-center mb-4">
                            <h5 className="font-semibold">Free</h5>
                            <p className="text-2xl font-bold">$0</p>
                            <p className="text-sm text-muted-foreground">por mês</p>
                          </div>
                          <ul className="space-y-2 text-sm">
                            <li>✅ 5 interações por dia</li>
                            <li>✅ 1 conexão n8n</li>
                            <li>✅ 3 workflows</li>
                            <li>✅ Todos os modelos AI</li>
                            <li>✅ 7 dias de histórico</li>
                          </ul>
                        </div>
                        
                        {/* Pro Plan */}
                        <div className="border-2 border-blue-500 rounded-lg p-4 relative">
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-blue-500">Recomendado</Badge>
                          </div>
                          <div className="text-center mb-4">
                            <h5 className="font-semibold">Pro</h5>
                            <p className="text-2xl font-bold">$20</p>
                            <p className="text-sm text-muted-foreground">por mês</p>
                          </div>
                          <ul className="space-y-2 text-sm">
                            <li>⚡ 500 créditos AI mensais</li>
                            <li>⚡ 3 conexões n8n</li>
                            <li>⚡ Workflows ilimitados</li>
                            <li>⚡ Todos os modelos AI</li>
                            <li>⚡ 6 meses de histórico</li>
                            <li>⚡ Suporte prioritário</li>
                            <li>⚡ Analytics avançados</li>
                          </ul>
                          <Button 
                            onClick={handleUpgrade}
                            disabled={isLoading}
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            Fazer Upgrade
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    <Button>Update Password</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-4">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                      <div>
                        <p className="font-medium">Sign Out</p>
                        <p className="text-sm text-muted-foreground">Sign out from your current session</p>
                      </div>
                      <Button variant="destructive" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
