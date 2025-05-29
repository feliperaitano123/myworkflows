
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, AlertProps } from './Alert';

interface AlertContextType {
  showAlert: (alert: Omit<AlertProps, 'id' | 'onDismiss'>) => void;
  dismissAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertProps[]>([]);

  const showAlert = useCallback((alert: Omit<AlertProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: AlertProps = {
      ...alert,
      id,
      onDismiss: dismissAlert,
    };

    setAlerts(prev => {
      // Limit to 3 alerts maximum
      const updated = [newAlert, ...prev].slice(0, 3);
      return updated;
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, dismissAlert }}>
      {children}
      
      {/* Alert Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {alerts.map(alert => (
          <Alert key={alert.id} {...alert} />
        ))}
      </div>
    </AlertContext.Provider>
  );
};
