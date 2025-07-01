import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from './UpgradeModal';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  triggerType?: 'daily_limit' | 'connection_limit' | 'workflow_limit' | 'feature_locked';
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true,
  triggerType = 'feature_locked'
}: FeatureGateProps) => {
  const { hasAccess } = useFeatureAccess();
  const [showModal, setShowModal] = useState(false);
  
  if (hasAccess(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgradePrompt) {
    return (
      <>
        <div 
          className="relative opacity-50 cursor-not-allowed"
          onClick={() => setShowModal(true)}
        >
          {children}
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded">
            <Lock className="w-6 h-6 text-gray-700" />
          </div>
        </div>
        
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          trigger={triggerType}
          context={{ feature }}
        />
      </>
    );
  }
  
  return null;
};