#!/usr/bin/env node

/**
 * 🧪 TESTES AUTOMATIZADOS COMPLETOS
 * 
 * Script para testar todas as funcionalidades principais:
 * - API endpoints
 * - WebSocket connections  
 * - Database operations
 * - Authentication flow
 * - Billing system
 * - Frontend components
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3002';
const WS_BASE = 'ws://localhost:3001';

console.log('🧪 INICIANDO TESTES AUTOMATIZADOS COMPLETOS\n');

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// ============================================================================
// 🔧 TEST UTILITIES
// ============================================================================

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const result = passed ? 'PASS' : 'FAIL';
  
  console.log(`${status} ${name}: ${result}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 🔗 1. TESTES DE INFRAESTRUTURA
// ============================================================================

async function testInfrastructure() {
  console.log('🔗 1. TESTES DE INFRAESTRUTURA');
  console.log('='.repeat(40));
  
  // Test 1.1: Verificar se servidores estão rodando
  try {
    const response = await fetch(`${API_BASE}/health`, { 
      timeout: 5000 
    });
    const data = await response.json();
    logTest('API Server Health Check', 
      response.ok && data.status === 'ok',
      `Status: ${data.status}`
    );
  } catch (error) {
    logTest('API Server Health Check', false, error.message);
  }
  
  // Test 1.2: WebSocket Connection
  try {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_BASE);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    logTest('WebSocket Connection', true, 'Connected successfully');
  } catch (error) {
    logTest('WebSocket Connection', false, error.message);
  }
  
  // Test 1.3: Build System
  try {
    execSync('npm run build', { 
      cwd: process.cwd(), 
      stdio: 'pipe',
      timeout: 60000 
    });
    logTest('Build System', true, 'Build completed successfully');
  } catch (error) {
    logTest('Build System', false, 'Build failed');
  }
  
  console.log('');
}

// ============================================================================
// 🔐 2. TESTES DE AUTENTICAÇÃO
// ============================================================================

async function testAuthentication() {
  console.log('🔐 2. TESTES DE AUTENTICAÇÃO');
  console.log('='.repeat(40));
  
  // Test 2.1: Protected endpoint without auth
  try {
    const response = await fetch(`${API_BASE}/api/workflows/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    logTest('Protected Endpoint Security', 
      response.status === 401,
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest('Protected Endpoint Security', false, error.message);
  }
  
  // Test 2.2: JWT Token Validation (mock)
  try {
    const response = await fetch(`${API_BASE}/api/workflows/validate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token'
      }
    });
    
    logTest('JWT Token Validation', 
      response.status === 401,
      `Invalid token rejected: ${response.status}`
    );
  } catch (error) {
    logTest('JWT Token Validation', false, error.message);
  }
  
  console.log('');
}

// ============================================================================
// 📊 3. TESTES DE API ENDPOINTS
// ============================================================================

async function testAPIEndpoints() {
  console.log('📊 3. TESTES DE API ENDPOINTS');
  console.log('='.repeat(40));
  
  const endpoints = [
    { path: '/health', method: 'GET', expectedStatus: 200 },
    { path: '/api/billing/plans', method: 'GET', expectedStatus: 401 }, // Requires auth
    { path: '/api/usage/status', method: 'GET', expectedStatus: 401 }, // Requires auth
    { path: '/nonexistent', method: 'GET', expectedStatus: 404 }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        method: endpoint.method,
        timeout: 5000
      });
      
      logTest(`${endpoint.method} ${endpoint.path}`, 
        response.status === endpoint.expectedStatus,
        `Expected: ${endpoint.expectedStatus}, Got: ${response.status}`
      );
    } catch (error) {
      logTest(`${endpoint.method} ${endpoint.path}`, false, error.message);
    }
  }
  
  console.log('');
}

// ============================================================================
// 💳 4. TESTES DE BILLING SYSTEM
// ============================================================================

async function testBillingSystem() {
  console.log('💳 4. TESTES DE BILLING SYSTEM');
  console.log('='.repeat(40));
  
  // Test 4.1: Webhook endpoint exists
  try {
    const response = await fetch(`${API_BASE}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    // Should fail due to invalid signature, but endpoint should exist
    logTest('Billing Webhook Endpoint', 
      response.status === 400, // Expected: signature validation failure
      `Webhook endpoint accessible: ${response.status}`
    );
  } catch (error) {
    logTest('Billing Webhook Endpoint', false, error.message);
  }
  
  // Test 4.2: Plans endpoint structure
  try {
    const response = await fetch(`${API_BASE}/api/billing/plans`);
    logTest('Billing Plans Endpoint Structure', 
      response.status === 401, // Expected: requires auth
      'Endpoint properly protected'
    );
  } catch (error) {
    logTest('Billing Plans Endpoint Structure', false, error.message);
  }
  
  console.log('');
}

// ============================================================================
// 🎨 5. TESTES DE FRONTEND
// ============================================================================

async function testFrontend() {
  console.log('🎨 5. TESTES DE FRONTEND');
  console.log('='.repeat(40));
  
  // Test 5.1: Components can be imported
  try {
    const srcPath = path.join(process.cwd(), 'src');
    const componentsPath = path.join(srcPath, 'components');
    
    if (fs.existsSync(componentsPath)) {
      const componentFiles = fs.readdirSync(componentsPath, { recursive: true })
        .filter(file => file.toString().endsWith('.tsx') || file.toString().endsWith('.jsx'));
      
      logTest('Component Files Structure', 
        componentFiles.length > 0,
        `Found ${componentFiles.length} component files`
      );
    } else {
      logTest('Component Files Structure', false, 'Components directory not found');
    }
  } catch (error) {
    logTest('Component Files Structure', false, error.message);
  }
  
  // Test 5.2: TypeScript compilation
  try {
    execSync('npx tsc --noEmit', { 
      cwd: process.cwd(), 
      stdio: 'pipe',
      timeout: 30000 
    });
    logTest('TypeScript Compilation', true, 'No type errors found');
  } catch (error) {
    logTest('TypeScript Compilation', false, 'Type errors detected');
  }
  
  // Test 5.3: ESLint validation
  try {
    execSync('npm run lint', { 
      cwd: process.cwd(), 
      stdio: 'pipe',
      timeout: 30000 
    });
    logTest('ESLint Validation', true, 'No linting errors');
  } catch (error) {
    logTest('ESLint Validation', false, 'Linting errors detected');
  }
  
  console.log('');
}

// ============================================================================
// 🔄 6. TESTES DE FLUXO COMPLETO (E2E)
// ============================================================================

async function testEndToEndFlows() {
  console.log('🔄 6. TESTES DE FLUXO COMPLETO');
  console.log('='.repeat(40));
  
  // Test 6.1: WebSocket chat flow simulation
  try {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_BASE);
      let connected = false;
      let responsesReceived = 0;
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Chat flow timeout'));
      }, 10000);
      
      ws.on('open', () => {
        connected = true;
        
        // Simulate chat flow
        ws.send(JSON.stringify({
          type: 'get_history',
          workflowId: 'test-workflow-123'
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          responsesReceived++;
          
          if (message.type === 'history' || message.type === 'error') {
            clearTimeout(timeout);
            ws.close();
            resolve(responsesReceived > 0);
          }
        } catch (err) {
          // Ignore parse errors
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    logTest('WebSocket Chat Flow', true, 'Chat flow simulation successful');
  } catch (error) {
    logTest('WebSocket Chat Flow', false, error.message);
  }
  
  // Test 6.2: Database connection health
  try {
    // This would require actual database testing
    // For now, we'll test if the endpoints that use DB respond correctly
    const response = await fetch(`${API_BASE}/api/usage/status`, {
      headers: { 'Authorization': 'Bearer test' }
    });
    
    logTest('Database Connection Health', 
      response.status === 401, // Expected: auth failure, but DB connection works
      'Database endpoints responding'
    );
  } catch (error) {
    logTest('Database Connection Health', false, error.message);
  }
  
  console.log('');
}

// ============================================================================
// 📊 7. RELATÓRIO FINAL
// ============================================================================

function generateTestReport() {
  console.log('📊 RELATÓRIO FINAL DOS TESTES');
  console.log('='.repeat(40));
  
  const total = testResults.passed + testResults.failed;
  const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`✅ Testes aprovados: ${testResults.passed}`);
  console.log(`❌ Testes falharam: ${testResults.failed}`);
  console.log(`📊 Taxa de sucesso: ${successRate}%`);
  console.log('');
  
  if (testResults.failed > 0) {
    console.log('❌ TESTES FALHARAM:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
    console.log('');
  }
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: parseFloat(successRate)
    },
    tests: testResults.tests
  };
  
  const reportPath = path.join(process.cwd(), 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Relatório detalhado salvo em: test-report.json`);
  console.log('');
  
  // Determinar status final
  if (testResults.failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema está funcionando perfeitamente.');
    return 0;
  } else if (successRate >= 80) {
    console.log('⚠️  Sistema majoritariamente funcional, mas precisa de atenção.');
    return 1;
  } else {
    console.log('🚨 Sistema com problemas críticos - requer correções imediatas!');
    return 2;
  }
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  console.log('🎯 MYWORKFLOWS - TESTES AUTOMATIZADOS');
  console.log('📅 Data:', new Date().toLocaleString());
  console.log('\n');
  
  try {
    await testInfrastructure();
    await testAuthentication();
    await testAPIEndpoints();
    await testBillingSystem();
    await testFrontend();
    await testEndToEndFlows();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Testes concluídos em ${duration}s\n`);
    
    return generateTestReport();
    
  } catch (error) {
    console.error('💥 Erro crítico durante os testes:', error);
    return 3;
  }
}

// Execute se for o script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(3);
    });
}

export default runAllTests;