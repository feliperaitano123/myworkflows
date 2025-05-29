
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAlert } from '@/components/AlertProvider';
import { 
  Plus, 
  ChevronRight, 
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

interface Connection {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastUsed: string;
  initials: string;
}

const MyConnections = () => {
  const { showAlert } = useAlert();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: ''
  });

  const [connections, setConnections] = useState<Connection[]>([
    {
      id: '1',
      name: 'Production Server',
      url: 'https://n8n.company.com',
      isActive: true,
      lastUsed: '2 hours ago',
      initials: 'PS'
    },
    {
      id: '2',
      name: 'Development Environment',
      url: 'https://dev-n8n.company.com',
      isActive: true,
      lastUsed: '1 day ago',
      initials: 'DE'
    },
    {
      id: '3',
      name: 'Staging Server',
      url: 'https://staging-n8n.company.com',
      isActive: false,
      lastUsed: '3 days ago',
      initials: 'SS'
    }
  ]);

  const handleAddConnection = () => {
    setIsEditing(false);
    setFormData({ name: '', url: '', apiKey: '' });
    setIsModalOpen(true);
  };

  const handleEditConnection = (connection: Connection) => {
    setIsEditing(true);
    setSelectedConnection(connection);
    setFormData({
      name: connection.name,
      url: connection.url,
      apiKey: '••••••••••••••••'
    });
    setIsModalOpen(true);
  };

  const handleDeleteConnection = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (isEditing && selectedConnection) {
        setConnections(prev => prev.map(conn => 
          conn.id === selectedConnection.id 
            ? { ...conn, name: formData.name }
            : conn
        ));
        showAlert({
          type: 'success',
          title: 'Connection Updated',
          message: 'Your N8N connection has been successfully updated.'
        });
      } else {
        const newConnection: Connection = {
          id: Date.now().toString(),
          name: formData.name,
          url: formData.url,
          isActive: true,
          lastUsed: 'Never',
          initials: formData.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
        };
        setConnections(prev => [...prev, newConnection]);
        showAlert({
          type: 'success',
          title: 'Connection Created',
          message: 'Your N8N connection has been successfully created.'
        });
      }
      
      setIsLoading(false);
      setIsModalOpen(false);
    }, 2000);
  };

  const confirmDelete = () => {
    if (selectedConnection) {
      setConnections(prev => prev.filter(conn => conn.id !== selectedConnection.id));
      showAlert({
        type: 'success',
        title: 'Connection Deleted',
        message: 'The connection has been successfully removed.'
      });
    }
    setIsDeleteModalOpen(false);
    setSelectedConnection(null);
  };

  const testConnection = () => {
    showAlert({
      type: 'success',
      title: 'Connection Test Successful',
      message: 'Successfully connected to your N8N instance.'
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="My Connections"
        subtitle="Manage your N8N workflow connections"
        actionButton={{
          label: 'Add Connection',
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
                <h2 className="text-xl font-semibold">No connections yet</h2>
                <p className="text-muted-foreground">
                  Start by connecting your first N8N instance to begin creating workflows.
                </p>
              </div>
              <Button onClick={handleAddConnection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Connection
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
                        {connection.initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">{connection.name}</h3>
                      <p className="text-sm text-muted-foreground max-w-md truncate">{connection.url}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={connection.isActive ? "default" : "secondary"} className="text-xs">
                          {connection.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Last used: {connection.lastUsed}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${connection.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleEditConnection(connection)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteConnection(connection)} 
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
              {isEditing ? "Edit Connection" : "Create New Connection"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update your N8N connection details" 
                : "Connect your N8N instance to start creating workflows"
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name *</Label>
              <Input 
                id="name"
                placeholder="My Production N8N"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              {formData.name && (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Valid connection name</span>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="url">N8N Instance URL *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="url"
                    placeholder="https://n8n.yourcompany.com"
                    className="pl-10"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  <span className="text-muted-foreground">
                    URL cannot be changed after creation
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">N8N API Key *</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="apiKey"
                  type={showPassword ? "text" : "password"}
                  placeholder="n8n_api_xxxxxxxxxxxxxxxx"
                  className="pl-10 pr-10"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
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
                  API key is encrypted and stored securely
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={testConnection}
                disabled={!formData.name || !formData.apiKey || (!formData.url && !isEditing)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>
          </form>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name || !formData.apiKey || (!formData.url && !isEditing)}
              onClick={handleSubmit}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? "Update" : "Create"} Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedConnection?.name}"? 
              This action cannot be undone and will affect all workflows using this connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyConnections;
