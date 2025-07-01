#!/usr/bin/env node

/**
 * 📋 SCRIPT MASTER DE MANUTENÇÃO
 * 
 * Executa rotina completa de manutenção do MyWorkflows:
 * - Health check
 * - Auditoria de código
 * - Testes automatizados
 * - Limpeza de arquivos temporários
 * - Otimização de performance
 * - Backup de configurações
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import runHealthCheck from './health-check.js';
import runAudit from './audit-app.js';
import runAllTests from './test-all.js';

console.log('📋 INICIANDO ROTINA COMPLETA DE MANUTENÇÃO\n');

let maintenanceResults = {
  timestamp: new Date().toISOString(),
  steps: [],
  overall: 'unknown'
};

// ============================================================================
// 🔧 UTILITIES
// ============================================================================

function logStep(name, status, details = '') {
  const emoji = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${emoji} ${name}: ${status.toUpperCase()}`);
  if (details) console.log(`   ${details}`);
  
  maintenanceResults.steps.push({
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// 🏗️ 1. PRÉ-MANUTENÇÃO
// ============================================================================

async function preMaintenance() {
  console.log('🏗️ 1. PRÉ-MANUTENÇÃO');
  console.log('='.repeat(40));
  
  // Verificar se estamos no diretório correto
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    if (packageJson.name !== 'vite_react_shadcn_ts') {
      throw new Error('Script deve ser executado na raiz do projeto MyWorkflows');
    }
    logStep('Verificação de Diretório', 'success', 'Executando na raiz do projeto');
  } catch (error) {
    logStep('Verificação de Diretório', 'error', error.message);
    return false;
  }
  
  // Criar backup das configurações importantes
  try {
    const backupDir = './maintenance-backup';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filesToBackup = [
      'package.json',
      '.env.example',
      'vite.config.ts',
      'tailwind.config.ts',
      'tsconfig.json'
    ];
    
    filesToBackup.forEach(file => {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(backupDir, file));
      }
    });
    
    logStep('Backup de Configurações', 'success', `${filesToBackup.length} arquivos salvos`);
  } catch (error) {
    logStep('Backup de Configurações', 'warning', error.message);
  }
  
  // Verificar se servidores estão rodando
  try {
    const response = await fetch('http://localhost:3002/health', { timeout: 3000 });
    if (response.ok) {
      logStep('Status dos Servidores', 'success', 'Servidores estão rodando');
    } else {
      logStep('Status dos Servidores', 'warning', 'Servidores responsivos mas com problemas');
    }
  } catch (error) {
    logStep('Status dos Servidores', 'warning', 'Servidores não estão rodando - alguns testes podem falhar');
  }
  
  console.log('');
  return true;
}

// ============================================================================
// 🔍 2. HEALTH CHECK
// ============================================================================

async function runMaintenanceHealthCheck() {
  console.log('🔍 2. HEALTH CHECK COMPLETO');
  console.log('='.repeat(40));
  
  try {
    const exitCode = await runHealthCheck();
    
    switch (exitCode) {
      case 0:
        logStep('Health Check', 'success', 'Sistema totalmente saudável');
        break;
      case 1:
        logStep('Health Check', 'warning', 'Sistema com avisos menores');
        break;
      case 2:
        logStep('Health Check', 'warning', 'Sistema com degradação');
        break;
      default:
        logStep('Health Check', 'error', 'Sistema com problemas críticos');
    }
  } catch (error) {
    logStep('Health Check', 'error', error.message);
  }
  
  console.log('');
}

// ============================================================================
// 🔍 3. AUDITORIA DE CÓDIGO
// ============================================================================

async function runMaintenanceAudit() {
  console.log('🔍 3. AUDITORIA DE CÓDIGO');
  console.log('='.repeat(40));
  
  try {
    await runAudit();
    logStep('Auditoria de Código', 'success', 'Auditoria concluída - veja audit-report.json');
  } catch (error) {
    logStep('Auditoria de Código', 'error', error.message);
  }
  
  console.log('');
}

// ============================================================================
// 🧪 4. TESTES AUTOMATIZADOS
// ============================================================================

async function runMaintenanceTests() {
  console.log('🧪 4. TESTES AUTOMATIZADOS');
  console.log('='.repeat(40));
  
  try {
    const exitCode = await runAllTests();
    
    switch (exitCode) {
      case 0:
        logStep('Testes Automatizados', 'success', 'Todos os testes passaram');
        break;
      case 1:
        logStep('Testes Automatizados', 'warning', 'Maioria dos testes passou');
        break;
      default:
        logStep('Testes Automatizados', 'error', 'Muitos testes falharam');
    }
  } catch (error) {
    logStep('Testes Automatizados', 'error', error.message);
  }
  
  console.log('');
}

// ============================================================================
// 🧹 5. LIMPEZA E OTIMIZAÇÃO
// ============================================================================

async function cleanupAndOptimize() {
  console.log('🧹 5. LIMPEZA E OTIMIZAÇÃO');
  console.log('='.repeat(40));
  
  // Limpar node_modules cache
  try {
    execSync('npm cache clean --force', { stdio: 'pipe' });
    logStep('Limpeza do Cache NPM', 'success', 'Cache limpo');
  } catch (error) {
    logStep('Limpeza do Cache NPM', 'warning', 'Erro ao limpar cache');
  }
  
  // Limpar arquivos de build antigos
  try {
    if (fs.existsSync('./dist')) {
      fs.rmSync('./dist', { recursive: true, force: true });
    }
    logStep('Limpeza de Build', 'success', 'Arquivos de build removidos');
  } catch (error) {
    logStep('Limpeza de Build', 'warning', error.message);
  }
  
  // Atualizar dependencies (verificação)
  try {
    const outdated = execSync('npm outdated --json', { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    if (outdated.trim()) {
      const outdatedPackages = JSON.parse(outdated);
      const count = Object.keys(outdatedPackages).length;
      logStep('Verificação de Dependencies', 'warning', 
        `${count} packages desatualizados encontrados`);
    } else {
      logStep('Verificação de Dependencies', 'success', 'Todas as dependencies atualizadas');
    }
  } catch (error) {
    // npm outdated retorna exit code 1 quando há packages outdated
    if (error.stdout && error.stdout.trim()) {
      try {
        const outdatedPackages = JSON.parse(error.stdout);
        const count = Object.keys(outdatedPackages).length;
        logStep('Verificação de Dependencies', 'warning', 
          `${count} packages desatualizados`);
      } catch (parseError) {
        logStep('Verificação de Dependencies', 'success', 'Dependencies parecem atualizadas');
      }
    } else {
      logStep('Verificação de Dependencies', 'warning', 'Não foi possível verificar');
    }
  }
  
  // Verificar vulnerabilidades de segurança
  try {
    execSync('npm audit --audit-level=high', { stdio: 'pipe' });
    logStep('Verificação de Segurança', 'success', 'Nenhuma vulnerabilidade crítica');
  } catch (error) {
    logStep('Verificação de Segurança', 'warning', 'Vulnerabilidades encontradas');
  }
  
  // Testar build
  try {
    execSync('npm run build', { stdio: 'pipe', timeout: 60000 });
    logStep('Teste de Build', 'success', 'Build executado com sucesso');
  } catch (error) {
    logStep('Teste de Build', 'error', 'Build falhou');
  }
  
  console.log('');
}

// ============================================================================
// 📊 6. MÉTRICAS E RELATÓRIOS
// ============================================================================

async function generateMetrics() {
  console.log('📊 6. MÉTRICAS E RELATÓRIOS');
  console.log('='.repeat(40));
  
  try {
    // Analisar tamanho do projeto
    const getSizeRecursive = (dir) => {
      let size = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
          size += getSizeRecursive(fullPath);
        } else if (item.isFile()) {
          size += fs.statSync(fullPath).size;
        }
      });
      
      return size;
    };
    
    const projectSize = getSizeRecursive('./src');
    const projectSizeMB = (projectSize / 1024 / 1024).toFixed(1);
    
    logStep('Análise de Tamanho', 'success', `Projeto: ${projectSizeMB}MB`);
    
    // Contar arquivos de código
    const getFileCount = (dir, extensions) => {
      let count = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.startsWith('.')) {
          count += getFileCount(fullPath, extensions);
        } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
          count++;
        }
      });
      
      return count;
    };
    
    const codeFiles = getFileCount('./src', ['.ts', '.tsx', '.js', '.jsx']);
    logStep('Contagem de Arquivos', 'success', `${codeFiles} arquivos de código`);
    
    // Analisar dependencies
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
    
    logStep('Análise de Dependencies', 'success', 
      `${depCount} dependencies, ${devDepCount} devDependencies`);
    
  } catch (error) {
    logStep('Geração de Métricas', 'error', error.message);
  }
  
  console.log('');
}

// ============================================================================
// 📊 7. RELATÓRIO FINAL
// ============================================================================

function generateMaintenanceReport() {
  console.log('📊 RELATÓRIO FINAL DE MANUTENÇÃO');
  console.log('='.repeat(40));
  
  const successCount = maintenanceResults.steps.filter(s => s.status === 'success').length;
  const warningCount = maintenanceResults.steps.filter(s => s.status === 'warning').length;
  const errorCount = maintenanceResults.steps.filter(s => s.status === 'error').length;
  const total = maintenanceResults.steps.length;
  
  console.log(`✅ Etapas bem-sucedidas: ${successCount}`);
  console.log(`⚠️  Etapas com avisos: ${warningCount}`);
  console.log(`❌ Etapas com erros: ${errorCount}`);
  console.log(`📊 Total de etapas: ${total}`);
  console.log('');
  
  // Determinar status geral
  if (errorCount === 0 && warningCount === 0) {
    maintenanceResults.overall = 'excellent';
    console.log('🎉 MANUTENÇÃO PERFEITA! Sistema em excelente estado.');
  } else if (errorCount === 0 && warningCount <= 3) {
    maintenanceResults.overall = 'good';
    console.log('😊 MANUTENÇÃO BOA! Sistema saudável com pequenos avisos.');
  } else if (errorCount <= 2) {
    maintenanceResults.overall = 'fair';
    console.log('😐 MANUTENÇÃO RAZOÁVEL! Sistema precisa de atenção.');
  } else {
    maintenanceResults.overall = 'poor';
    console.log('😟 MANUTENÇÃO PROBLEMÁTICA! Sistema requer correções imediatas.');
  }
  
  console.log('');
  
  // Mostrar próximos passos
  console.log('🔄 PRÓXIMOS PASSOS RECOMENDADOS:');
  
  if (warningCount > 0 || errorCount > 0) {
    console.log('   1. Revisar itens com avisos/erros acima');
    console.log('   2. Corrigir problemas críticos primeiro');
  }
  
  console.log('   3. Execute esta manutenção semanalmente');
  console.log('   4. Monitore relatórios de health-check diariamente');
  console.log('   5. Mantenha dependencies atualizadas');
  console.log('   6. Execute testes antes de cada deploy');
  console.log('');
  
  // Salvar relatório completo
  const reportPath = './maintenance-report.json';
  maintenanceResults.duration = Date.now() - startTime;
  fs.writeFileSync(reportPath, JSON.stringify(maintenanceResults, null, 2));
  
  console.log(`📄 Relatório completo salvo em: ${reportPath}`);
  
  return maintenanceResults.overall;
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

let startTime;

async function runMaintenance() {
  startTime = Date.now();
  
  console.log('🎯 MYWORKFLOWS - MANUTENÇÃO COMPLETA');
  console.log('📅 Data:', new Date().toLocaleString());
  console.log('⏱️  Iniciando manutenção...');
  console.log('\n');
  
  try {
    // Executar todas as etapas
    const preCheck = await preMaintenance();
    if (!preCheck) {
      console.log('❌ Pré-verificação falhou. Abortando manutenção.');
      return 1;
    }
    
    await runMaintenanceHealthCheck();
    await runMaintenanceAudit();
    await runMaintenanceTests();
    await cleanupAndOptimize();
    await generateMetrics();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Manutenção concluída em ${duration}s\n`);
    
    const overallStatus = generateMaintenanceReport();
    
    // Return appropriate exit code
    switch (overallStatus) {
      case 'excellent': return 0;
      case 'good': return 0;
      case 'fair': return 1;
      case 'poor': return 2;
      default: return 3;
    }
    
  } catch (error) {
    console.error('💥 Erro crítico durante manutenção:', error);
    return 4;
  }
}

// Execute se for o script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runMaintenance()
    .then(exitCode => {
      console.log(`\n🏁 Manutenção finalizada com código: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(4);
    });
}

export default runMaintenance;