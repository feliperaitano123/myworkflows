
import React from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  BarChart3, 
  Cable, 
  MessageSquare, 
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
  const handleNewWorkflow = () => {
    console.log('Creating new workflow...');
  };

  const metrics = [
    {
      label: 'Total Workflows',
      value: '12',
      change: '+2',
      changePercent: '+20%',
      icon: BarChart3,
      trend: 'up'
    },
    {
      label: 'Active Connections',
      value: '4',
      change: '+1',
      changePercent: '+33%',
      icon: Cable,
      trend: 'up'
    },
    {
      label: 'Messages This Month',
      value: '847',
      change: '+156',
      changePercent: '+23%',
      icon: MessageSquare,
      trend: 'up'
    },
    {
      label: 'API Calls Today',
      value: '32',
      change: '+8',
      changePercent: '+33%',
      icon: Zap,
      trend: 'up'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'workflow_created',
      title: 'New workflow created',
      description: 'Sales Pipeline Automation',
      time: '2 minutes ago',
      icon: CheckCircle2,
      iconColor: 'text-green-500'
    },
    {
      id: 2,
      type: 'connection_added',
      title: 'N8N connection added',
      description: 'Production Server',
      time: '1 hour ago',
      icon: Cable,
      iconColor: 'text-blue-500'
    },
    {
      id: 3,
      type: 'message_sent',
      title: 'AI conversation started',
      description: 'Customer Support Workflow',
      time: '3 hours ago',
      icon: MessageSquare,
      iconColor: 'text-purple-500'
    },
    {
      id: 4,
      type: 'workflow_executed',
      title: 'Workflow executed successfully',
      description: 'Email Marketing Campaign',
      time: '5 hours ago',
      icon: Zap,
      iconColor: 'text-orange-500'
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Overview of your workflow analytics and system status"
        actionButton={{
          label: 'New Workflow',
          icon: Plus,
          onClick: handleNewWorkflow
        }}
      />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {metric.value}
                  </p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">{metric.changePercent}</span>
                    <span className="text-muted-foreground ml-1">from last month</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <metric.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                  <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      {activity.title}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Cable className="h-5 w-5" />
              <span className="text-sm">Add Connection</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">Start Chat</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">View Analytics</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
