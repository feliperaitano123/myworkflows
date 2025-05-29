
import React from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LogOut, Save } from 'lucide-react';

const Settings = () => {
  const handleSaveChanges = () => {
    console.log('Saving changes...');
  };

  const handleLogout = () => {
    console.log('Logging out...');
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
        <Tabs defaultValue="account" className="space-y-6">
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
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Pro Plan</h4>
                      <p className="text-sm text-muted-foreground">10,000 tokens/month</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Usage This Month</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tokens Used</span>
                      <span>2,347 / 10,000</span>
                    </div>
                    <Progress value={23.47} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Usage resets on the 1st of each month
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-4">Billing History</h4>
                  <div className="space-y-3">
                    {[
                      { date: 'Nov 1, 2024', amount: '$29.00', status: 'Paid' },
                      { date: 'Oct 1, 2024', amount: '$29.00', status: 'Paid' },
                      { date: 'Sep 1, 2024', amount: '$29.00', status: 'Paid' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="text-sm font-medium">{item.date}</p>
                          <p className="text-xs text-muted-foreground">Pro Plan</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.amount}</p>
                          <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
