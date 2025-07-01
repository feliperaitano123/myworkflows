import { useCallback } from 'react';
import { useUserProfile } from './useUserProfile';
import { useConnections } from './useConnections';
import { useWorkflows } from './useWorkflows';

interface PlanConfig {
  credits: {
    type: 'daily_limit' | 'monthly_credits';
    amount: number;
    reset_type: string;
  };
  limits: {
    max_connections: number;
    workflows_per_connection: number;
    history_retention_days: number;
  };
  features: {
    all_models: boolean;
    export_history: boolean;
    advanced_analytics: boolean;
    priority_support: boolean;
  };
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    credits: {
      type: 'daily_limit',
      amount: 5,
      reset_type: '24h_after_first'
    },
    limits: {
      max_connections: 1,
      workflows_per_connection: 3,
      history_retention_days: 7
    },
    features: {
      all_models: true,
      export_history: false,
      advanced_analytics: false,
      priority_support: false
    }
  },
  pro: {
    credits: {
      type: 'monthly_credits',
      amount: 500,
      reset_type: 'monthly'
    },
    limits: {
      max_connections: 3,
      workflows_per_connection: -1, // unlimited
      history_retention_days: 180
    },
    features: {
      all_models: true,
      export_history: true,
      advanced_analytics: true,
      priority_support: true
    }
  }
};

export const useFeatureAccess = () => {
  const { profile } = useUserProfile();
  const { connections } = useConnections();
  const { workflows } = useWorkflows();

  const getPlanConfig = useCallback((planType: string = 'free'): PlanConfig => {
    return PLAN_CONFIGS[planType] || PLAN_CONFIGS.free;
  }, []);

  const hasAccess = useCallback((feature: string): boolean => {
    if (!profile) return false;
    
    const planConfig = getPlanConfig(profile.plan_type);
    
    switch (feature) {
      case 'export_history':
        return planConfig.features.export_history;
      case 'advanced_analytics':
        return planConfig.features.advanced_analytics;
      case 'priority_support':
        return planConfig.features.priority_support;
      case 'multiple_connections':
        return planConfig.limits.max_connections > 1;
      case 'unlimited_workflows':
        return planConfig.limits.workflows_per_connection === -1;
      default:
        return false;
    }
  }, [profile, getPlanConfig]);

  const checkLimit = useCallback((limitType: string, current: number) => {
    if (!profile) return { allowed: true, limit: 0, current };
    
    const planConfig = getPlanConfig(profile.plan_type);
    
    switch (limitType) {
      case 'connections':
        return {
          allowed: current < planConfig.limits.max_connections,
          limit: planConfig.limits.max_connections,
          current
        };
      case 'workflows':
        const limit = planConfig.limits.workflows_per_connection;
        return {
          allowed: limit === -1 || current < limit,
          limit: limit === -1 ? 'unlimited' : limit,
          current
        };
      default:
        return { allowed: true, limit: 0, current };
    }
  }, [profile, getPlanConfig]);

  const canCreateConnection = useCallback(() => {
    const connectionsCount = connections?.length || 0;
    return checkLimit('connections', connectionsCount);
  }, [connections, checkLimit]);

  const canCreateWorkflow = useCallback((connectionId?: string) => {
    if (!connectionId) return { allowed: true, limit: 0, current: 0 };
    
    const workflowsForConnection = workflows?.filter(w => w.connection_id === connectionId).length || 0;
    return checkLimit('workflows', workflowsForConnection);
  }, [workflows, checkLimit]);

  return {
    hasAccess,
    checkLimit,
    canCreateConnection,
    canCreateWorkflow,
    getPlanConfig: () => getPlanConfig(profile?.plan_type)
  };
};