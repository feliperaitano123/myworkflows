
import React from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Bell } from 'lucide-react';

const Library = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Library"
        subtitle="AI resources and templates for better workflow assistance"
      />
      
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md">
          <div className="space-y-6">
            <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Coming Soon</h2>
              <p className="text-muted-foreground">
                We're working on an amazing library of AI resources and templates to help improve your workflow responses.
              </p>
            </div>
            
            <Button variant="outline" disabled>
              <Bell className="h-4 w-4 mr-2" />
              Notify Me When Ready
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Library;
