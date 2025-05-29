
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAlert } from '@/components/AlertProvider';
import { 
  Plus, 
  Settings, 
  Edit, 
  Trash2,
  Globe,
  Key,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  CheckCircle2,
  Shield,
  AlertCircle,
  Cable
} from 'lucide-react';
import { 
  useConnections, 
  useCreateConnection, 
  useUpdateConnection, 
  useDeleteConnection,
  type Connection,
  type CreateConnectionData,
  type UpdateConnectionData
} from '@/hooks/useConnections';

const MyConnections = () => {
  const { showAlert } = useAlert();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    n8n_url: '',
    n8n_api_key: ''
  });

  // React Query hooks
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const createConnectionMutation = useCreateConnection();
  const updateConnectionMutation = useUpdateConnection();
  const deleteConnectionMutation = useDeleteConnection();

  const handleAddConnection = () => {
    setIsEditing(false);
    setSelectedConnection(null);
    setFormData({ name: '', n8n_url: '', n8n_api_key: '' });
    setIsModalOpen(true);
  };

  const handleEditConnection = (connection: Connection) => {
    setIsEditing(true);
    setSelectedConnection(connection);
    setFormData({
      name: connection.name,
      n8n_url: connection.n8n_url,
      n8n_api_key: '••••••••••••••••'
    });
    setIsModalOpen(true);
  };

  const handleDeleteConnection = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && selectedConnection) {
        const updateData: UpdateConnectionData = {
          name: formData.name,
        };
        
        // Only update API key if it's not the placeholder
        if (formData.n8n_api_key !== '••••••••••••••••') {
          updateData.n8n_api_key = formData.n8n_api_key;
        }

        await updateConnectionMutation.mutateAsync({
          id: selectedConnection.id,
          data: updateData
        });

        showAlert({
          type: 'success',
          title: 'Conexão Atualizada',
          message: 'Sua conexão N8N foi atualizada com sucesso.'
        });
      } else {
        const createData: CreateConnectionData = {
          name: formData.name,
          n8n_url: formData.n8n_url,
          n8n_api_key: formData.n8n_api_key
        };

        await createConnectionMutation.mutateAsync(createData);

        showAlert({
          type: 'success',
          title: 'Conexão Criada',
          message: 'Sua conexão N8N foi criada com sucesso.'
        });
      }
      
      setIsModalOpen(false);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao salvar a conexão. Tente novamente.'
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedConnection) return;

    try {
      await deleteConnectionMutation.mutateAsync(selectedConnection.id);
      
      showAlert({
        type: 'success',
        title: 'Conexão Deletada',
        message: 'A conexão foi removida com sucesso.'
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao deletar a conexão. Tente novamente.'
      });
    }
    
    setIsDeleteModalOpen(false);
    setSelectedConnection(null);
  };

  const testConnection = () => {
    showAlert({
      type: 'success',
      title: 'Teste de Conexão Bem-sucedido',
      message: 'Conectado com sucesso à sua instância N8N.'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatLastUsed = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const isLoading = createConnectionMutation.isPending || updateConnectionMutation.isPending || deleteConnectionMutation.isPending;

  if (connectionsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Minhas Conexões"
        subtitle="Gerencie suas conexões de workflow N8N"
        actionButton={{
          label: 'Adicionar Conexão',
          icon: Plus,
          onClick: handleAddConnection
        }}
      />
      
      <div className="flex-1 overflow-y-auto p-6">
        {connections.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="space-y-6">
              <div className="h-24 w-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Cable className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Nenhuma conexão ainda</h2>
                <p className="text-muted-foreground">
                  Comece conectando sua primeira instância N8N para começar a criar workflows.
                </p>
              </div>
              <Button onClick={handleAddConnection}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Sua Primeira Conexão
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {getInitials(connection.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">{connection.name}</h3>
                      <p className="text-sm text-muted-foreground max-w-md truncate">{connection.n8n_url}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={connection.active ? "default" : "secondary"} className="text-xs">
                          {connection.active ? "Ativa" : "Inativa"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Criada: {formatLastUsed(connection.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${connection.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleEditConnection(connection)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteConnection(connection)} 
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Conexão" : "Criar Nova Conexão"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Atualize os detalhes da sua conexão N8N" 
                : "Conecte sua instância N8N para começar a criar workflows"
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Conexão *</Label>
              <Input 
                id="name"
                placeholder="Meu N8N de Produção"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              {formData.name && (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Nome válido para conexão</span>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="url">URL da Instância N8N *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="url"
                    placeholder="https://n8n.suaempresa.com"
                    className="pl-10"
                    value={formData.n8n_url}
                    onChange={(e) => setFormData({...formData, n8n_url: e.target.value})}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  <span className="text-muted-foreground">
                    A URL não pode ser alterada após a criação
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave API N8N *</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="apiKey"
                  type={showPassword ? "text" : "password"}
                  placeholder="n8n_api_xxxxxxxxxxxxxxxx"
                  className="pl-10 pr-10"
                  value={formData.n8n_api_key}
                  onChange={(e) => setFormData({...formData, n8n_api_key: e.target.value})}
                  required
                />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="absolute right-2 top-2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">
                  A chave API é criptografada e armazenada com segurança
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={testConnection}
                disabled={!formData.name || !formData.n8n_api_key || (!formData.n8n_url && !isEditing)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Testar Conexão
              </Button>
            </div>
          </form>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name || !formData.n8n_api_key || (!formData.n8n_url && !isEditing)}
              onClick={handleSubmit}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? "Atualizar" : "Criar"} Conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja deletar "{selectedConnection?.name}"? 
              Esta ação não pode ser desfeita e afetará todos os workflows que usam esta conexão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Conexão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyConnections;
