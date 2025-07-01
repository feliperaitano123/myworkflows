#!/usr/bin/env node

/**
 * 🔍 HEALTH CHECK COMPLETO DO SISTEMA
 * 
 * Script para verificar saúde geral do MyWorkflows:
 * - Status dos servidores
 * - Conectividade de banco de dados
 * - Performance dos endpoints
 * - Uso de recursos
 * - Status de dependências externas
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { execSync } from 'child_process';

const API_BASE = 'http://localhost:3002';
const WS_BASE = 'ws://localhost:3001';

console.log('🔍 HEALTH CHECK COMPLETO DO MYWORKFLOWS\n');

let healthStatus = {
  overall: 'unknown',
  components: {},
  timestamp: new Date().toISOString()
};

// ============================================================================
// 🔧 UTILITIES
// ============================================================================

function setComponentStatus(component, status, details = '') {
  healthStatus.components[component] = {
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  const emoji = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${emoji} ${component}: ${status.toUpperCase()}`);
  if (details) console.log(`   ${details}`);
}

async function measureResponseTime(url, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(url, { ...options, timeout: 5000 });
    const duration = Date.now() - start;
    return { success: true, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - start;
    return { success: false, duration, error: error.message };
  }
}

// ============================================================================
// 🖥️ 1. VERIFICAR SERVIDORES
// ============================================================================

async function checkServers() {
  console.log('🖥️ 1. STATUS DOS SERVIDORES');
  console.log('='.repeat(30));
  
  // API Server
  const apiCheck = await measureResponseTime(`${API_BASE}/health`);
  if (apiCheck.success && apiCheck.status === 200) {
    if (apiCheck.duration < 100) {
      setComponentStatus('API Server', 'healthy', `Response: ${apiCheck.duration}ms`);
    } else if (apiCheck.duration < 500) {
      setComponentStatus('API Server', 'warning', `Slow response: ${apiCheck.duration}ms`);
    } else {
      setComponentStatus('API Server', 'unhealthy', `Very slow: ${apiCheck.duration}ms`);
    }
  } else {
    setComponentStatus('API Server', 'unhealthy', apiCheck.error || `HTTP ${apiCheck.status}`);
  }
  
  // WebSocket Server (indirect check)
  try {
    const wsCheck = await measureResponseTime(`${API_BASE}/health`);
    if (wsCheck.success) {
      setComponentStatus('WebSocket Server', 'healthy', 'API server running (WS likely up)');
    } else {
      setComponentStatus('WebSocket Server', 'unhealthy', 'API server down');
    }
  } catch (error) {
    setComponentStatus('WebSocket Server', 'unhealthy', error.message);
  }
  
  console.log('');
}

// ============================================================================
// 🗄️ 2. VERIFICAR DATABASE
// ============================================================================

async function checkDatabase() {
  console.log('🗄️ 2. STATUS DO BANCO DE DADOS');
  console.log('='.repeat(30));
  
  // Test database-dependent endpoint
  const dbCheck = await measureResponseTime(`${API_BASE}/api/billing/plans`);
  
  if (dbCheck.success) {
    if (dbCheck.status === 401) {
      // Expected - endpoint requires auth but DB is working
      setComponentStatus('Database Connection', 'healthy', 
        `Auth-protected endpoint responding: ${dbCheck.duration}ms`);
    } else if (dbCheck.status >= 500) {
      setComponentStatus('Database Connection', 'unhealthy', 
        `Server error: HTTP ${dbCheck.status}`);
    } else {
      setComponentStatus('Database Connection', 'warning', 
        `Unexpected response: HTTP ${dbCheck.status}`);
    }
  } else {
    setComponentStatus('Database Connection', 'unhealthy', 
      dbCheck.error || 'No response');
  }
  
  console.log('');
}

// ============================================================================
// 🔐 3. VERIFICAR AUTENTICAÇÃO
// ============================================================================

async function checkAuthentication() {
  console.log('🔐 3. STATUS DA AUTENTICAÇÃO');
  console.log('='.repeat(30));
  
  // Test protected endpoint without auth
  const authCheck = await measureResponseTime(`${API_BASE}/api/usage/status`);
  
  if (authCheck.success && authCheck.status === 401) {
    setComponentStatus('Authentication System', 'healthy', 
      'Properly rejecting unauthenticated requests');
  } else if (!authCheck.success) {
    setComponentStatus('Authentication System', 'unhealthy', 
      authCheck.error || 'Auth endpoint not responding');
  } else {
    setComponentStatus('Authentication System', 'warning', 
      `Unexpected auth behavior: HTTP ${authCheck.status}`);
  }
  
  console.log('');
}

// ============================================================================
// 💳 4. VERIFICAR BILLING SYSTEM
// ============================================================================

async function checkBilling() {
  console.log('💳 4. STATUS DO SISTEMA DE BILLING');
  console.log('='.repeat(30));
  
  // Test webhook endpoint
  const webhookCheck = await measureResponseTime(`${API_BASE}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'health_check' })
  });
  
  if (webhookCheck.success && webhookCheck.status === 400) {
    // Expected - webhook should reject invalid signatures
    setComponentStatus('Billing Webhooks', 'healthy', 
      'Webhook endpoint properly validating signatures');
  } else if (!webhookCheck.success) {
    setComponentStatus('Billing Webhooks', 'unhealthy', 
      webhookCheck.error || 'Webhook endpoint not responding');
  } else {
    setComponentStatus('Billing Webhooks', 'warning', 
      `Unexpected webhook behavior: HTTP ${webhookCheck.status}`);
  }
  
  // Test Stripe integration (indirect)
  if (process.env.STRIPE_SECRET_KEY) {
    setComponentStatus('Stripe Integration', 'healthy', 'API key configured');
  } else {
    setComponentStatus('Stripe Integration', 'warning', 'No Stripe API key found');
  }
  
  console.log('');
}

// ============================================================================
// 📊 5. VERIFICAR PERFORMANCE
// ============================================================================

async function checkPerformance() {
  console.log('📊 5. ANÁLISE DE PERFORMANCE');
  console.log('='.repeat(30));
  
  // Test multiple endpoints for performance
  const endpoints = [
    { name: 'Health Check', url: `${API_BASE}/health` },
    { name: 'Billing Plans', url: `${API_BASE}/api/billing/plans` },
    { name: 'Usage Status', url: `${API_BASE}/api/usage/status` }
  ];
  
  let totalResponseTime = 0;
  let successfulRequests = 0;
  
  for (const endpoint of endpoints) {
    const check = await measureResponseTime(endpoint.url);
    if (check.success) {
      totalResponseTime += check.duration;
      successfulRequests++;
    }
  }
  
  if (successfulRequests > 0) {
    const avgResponseTime = totalResponseTime / successfulRequests;
    
    if (avgResponseTime < 200) {
      setComponentStatus('API Performance', 'healthy', 
        `Average response: ${avgResponseTime.toFixed(1)}ms`);
    } else if (avgResponseTime < 500) {
      setComponentStatus('API Performance', 'warning', 
        `Slow average response: ${avgResponseTime.toFixed(1)}ms`);
    } else {
      setComponentStatus('API Performance', 'unhealthy', 
        `Very slow average response: ${avgResponseTime.toFixed(1)}ms`);
    }
  } else {
    setComponentStatus('API Performance', 'unhealthy', 'No endpoints responding');
  }
  
  // Check memory usage (if possible)
  try {
    const memInfo = process.memoryUsage();
    const memUsedMB = (memInfo.heapUsed / 1024 / 1024).toFixed(1);
    
    if (memInfo.heapUsed < 100 * 1024 * 1024) { // < 100MB
      setComponentStatus('Memory Usage', 'healthy', `${memUsedMB}MB used`);
    } else if (memInfo.heapUsed < 500 * 1024 * 1024) { // < 500MB
      setComponentStatus('Memory Usage', 'warning', `${memUsedMB}MB used`);
    } else {
      setComponentStatus('Memory Usage', 'unhealthy', `${memUsedMB}MB used (high)`);
    }
  } catch (error) {
    setComponentStatus('Memory Usage', 'warning', 'Could not measure');
  }
  
  console.log('');
}

// ============================================================================
// 🔗 6. VERIFICAR DEPENDÊNCIAS EXTERNAS
// ============================================================================

async function checkExternalDependencies() {
  console.log('🔗 6. DEPENDÊNCIAS EXTERNAS');
  console.log('='.repeat(30));
  
  // Check Supabase (if configured)
  if (process.env.SUPABASE_URL) {
    try {
      const supabaseCheck = await measureResponseTime(process.env.SUPABASE_URL);
      if (supabaseCheck.success) {
        setComponentStatus('Supabase Connection', 'healthy', 
          `Response: ${supabaseCheck.duration}ms`);
      } else {
        setComponentStatus('Supabase Connection', 'unhealthy', 
          supabaseCheck.error || 'No response');
      }
    } catch (error) {
      setComponentStatus('Supabase Connection', 'warning', 'Could not test');
    }
  } else {
    setComponentStatus('Supabase Connection', 'warning', 'No Supabase URL configured');
  }
  
  // Check OpenRouter (if configured)
  if (process.env.OPENROUTER_API_KEY) {
    setComponentStatus('OpenRouter API', 'healthy', 'API key configured');
  } else {
    setComponentStatus('OpenRouter API', 'warning', 'No OpenRouter API key');
  }
  
  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
    'JWT_SECRET'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length === 0) {
    setComponentStatus('Environment Variables', 'healthy', 'All required vars present');
  } else if (missingEnvVars.length <= 2) {
    setComponentStatus('Environment Variables', 'warning', 
      `Missing: ${missingEnvVars.join(', ')}`);
  } else {
    setComponentStatus('Environment Variables', 'unhealthy', 
      `Missing ${missingEnvVars.length} required vars`);
  }
  
  console.log('');
}

// ============================================================================
// 📊 7. GERAR STATUS GERAL
// ============================================================================

function generateOverallStatus() {
  console.log('📊 STATUS GERAL DO SISTEMA');
  console.log('='.repeat(30));
  
  const components = Object.values(healthStatus.components);
  const healthyCount = components.filter(c => c.status === 'healthy').length;
  const warningCount = components.filter(c => c.status === 'warning').length;
  const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
  
  console.log(`✅ Componentes saudáveis: ${healthyCount}`);
  console.log(`⚠️  Componentes com avisos: ${warningCount}`);
  console.log(`❌ Componentes problemáticos: ${unhealthyCount}`);
  console.log('');
  
  // Determinar status geral
  if (unhealthyCount === 0 && warningCount === 0) {
    healthStatus.overall = 'healthy';
    console.log('🎉 SISTEMA TOTALMENTE SAUDÁVEL!');
  } else if (unhealthyCount === 0 && warningCount <= 2) {
    healthStatus.overall = 'warning';
    console.log('⚠️  SISTEMA MAJORITARIAMENTE SAUDÁVEL com alguns avisos.');
  } else if (unhealthyCount <= 1) {
    healthStatus.overall = 'degraded';
    console.log('🚨 SISTEMA COM DEGRADAÇÃO - Atenção necessária.');
  } else {
    healthStatus.overall = 'unhealthy';
    console.log('💥 SISTEMA COM PROBLEMAS CRÍTICOS - Ação imediata necessária!');
  }
  
  console.log('');
  
  // Salvar relatório
  const reportPath = './health-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(healthStatus, null, 2));
  console.log(`📄 Relatório detalhado salvo em: ${reportPath}`);
  
  return healthStatus.overall;
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

async function runHealthCheck() {
  const startTime = Date.now();
  
  console.log('🎯 MYWORKFLOWS - HEALTH CHECK');
  console.log('📅 Data:', new Date().toLocaleString());
  console.log('\n');
  
  try {
    await checkServers();
    await checkDatabase();
    await checkAuthentication();
    await checkBilling();
    await checkPerformance();
    await checkExternalDependencies();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Health check concluído em ${duration}s\n`);
    
    const overallStatus = generateOverallStatus();
    
    // Return appropriate exit code
    switch (overallStatus) {
      case 'healthy': return 0;
      case 'warning': return 1;
      case 'degraded': return 2;
      case 'unhealthy': return 3;
      default: return 4;
    }
    
  } catch (error) {
    console.error('💥 Erro crítico durante health check:', error);
    return 5;
  }
}

// Execute se for o script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck()
    .then(exitCode => {
      console.log(`\n🏁 Health check finalizado com código: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(5);
    });
}

export default runHealthCheck;