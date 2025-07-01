#!/usr/bin/env node

/**
 * 🔍 AUDITORIA COMPLETA DO MYWORKFLOWS
 * 
 * Script para verificar estado geral da aplicação:
 * - Unused dependencies
 * - Unused components
 * - Dead code
 * - Performance issues
 * - Security vulnerabilities
 * - File size analysis
 * - Bundle analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 INICIANDO AUDITORIA COMPLETA DO MYWORKFLOWS\n');

// ============================================================================
// 📦 1. ANÁLISE DE DEPENDÊNCIAS
// ============================================================================

async function auditDependencies() {
  console.log('📦 1. ANÁLISE DE DEPENDÊNCIAS');
  console.log('='.repeat(50));
  
  try {
    // Ler package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    console.log(`📊 Dependencies: ${dependencies.length}`);
    console.log(`🔧 DevDependencies: ${devDependencies.length}`);
    
    // Verificar dependencies não utilizadas
    console.log('\n🔍 Verificando dependencies não utilizadas...');
    
    const allFiles = getAllJsFiles(path.join(projectRoot, 'src'));
    const usedDependencies = new Set();
    
    // Ler todos os arquivos e verificar imports
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Verificar imports ES6
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      
      [...importMatches, ...requireMatches].forEach(match => {
        const depMatch = match.match(/['"]([^'"]+)['"]/);
        if (depMatch && !depMatch[1].startsWith('.') && !depMatch[1].startsWith('@/')) {
          const dep = depMatch[1].split('/')[0];
          if (dep.startsWith('@')) {
            usedDependencies.add(dep + '/' + depMatch[1].split('/')[1]);
          } else {
            usedDependencies.add(dep);
          }
        }
      });
    });
    
    // Encontrar dependencies não utilizadas
    const unusedDeps = dependencies.filter(dep => !usedDependencies.has(dep));
    const unusedDevDeps = devDependencies.filter(dep => !usedDependencies.has(dep));
    
    if (unusedDeps.length > 0) {
      console.log('\n⚠️  DEPENDENCIES NÃO UTILIZADAS:');
      unusedDeps.forEach(dep => console.log(`   - ${dep}`));
    }
    
    if (unusedDevDeps.length > 0) {
      console.log('\n⚠️  DEV DEPENDENCIES POTENCIALMENTE NÃO UTILIZADAS:');
      unusedDevDeps.forEach(dep => console.log(`   - ${dep}`));
    }
    
    if (unusedDeps.length === 0 && unusedDevDeps.length === 0) {
      console.log('✅ Todas as dependencies parecem estar em uso!');
    }
    
    // Verificar vulnerabilidades
    console.log('\n🛡️  Verificando vulnerabilidades de segurança...');
    try {
      execSync('npm audit --audit-level=moderate', { cwd: projectRoot, stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Encontradas vulnerabilidades - execute: npm audit fix');
    }
    
  } catch (error) {
    console.error('❌ Erro na análise de dependências:', error.message);
  }
  
  console.log('\n');
}

// ============================================================================
// 🧹 2. ANÁLISE DE COMPONENTES E CÓDIGO MORTO  
// ============================================================================

async function auditUnusedCode() {
  console.log('🧹 2. ANÁLISE DE COMPONENTES E CÓDIGO MORTO');
  console.log('='.repeat(50));
  
  try {
    const srcFiles = getAllJsFiles(path.join(projectRoot, 'src'));
    const components = new Map();
    const usedComponents = new Set();
    
    // 1. Catalogar todos os componentes
    srcFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(path.join(projectRoot, 'src'), file);
      
      // Detectar exports de componentes
      const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g) || [];
      exportMatches.forEach(match => {
        const componentMatch = match.match(/(\w+)$/);
        if (componentMatch) {
          components.set(componentMatch[1], relativePath);
        }
      });
      
      // Detectar exports nomeados
      const namedExports = content.match(/export\s*{\s*([^}]+)\s*}/g) || [];
      namedExports.forEach(match => {
        const exports = match.match(/{([^}]+)}/)[1];
        exports.split(',').forEach(exp => {
          const name = exp.trim().split(' as ')[0].trim();
          if (name && name !== 'default') {
            components.set(name, relativePath);
          }
        });
      });
    });
    
    // 2. Verificar quais componentes são usados
    srcFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Verificar imports
      const imports = content.match(/import\s+.*\s+from\s+['"][^'"]+['"]/g) || [];
      imports.forEach(imp => {
        const namedImports = imp.match(/{\s*([^}]+)\s*}/);
        if (namedImports) {
          namedImports[1].split(',').forEach(name => {
            usedComponents.add(name.trim().split(' as ')[0].trim());
          });
        }
        
        const defaultImport = imp.match(/import\s+(\w+)\s+from/);
        if (defaultImport) {
          usedComponents.add(defaultImport[1]);
        }
      });
      
      // Verificar uso direto no JSX
      components.forEach((_, componentName) => {
        if (content.includes(`<${componentName}`) || 
            content.includes(`${componentName}(`)) {
          usedComponents.add(componentName);
        }
      });
    });
    
    // 3. Encontrar componentes não utilizados
    const unusedComponents = [];
    components.forEach((filePath, componentName) => {
      if (!usedComponents.has(componentName) && 
          !componentName.includes('App') && 
          !componentName.includes('main') &&
          !componentName.includes('Root')) {
        unusedComponents.push({ name: componentName, file: filePath });
      }
    });
    
    console.log(`📊 Total de componentes encontrados: ${components.size}`);
    console.log(`✅ Componentes em uso: ${usedComponents.size}`);
    
    if (unusedComponents.length > 0) {
      console.log('\n⚠️  COMPONENTES POTENCIALMENTE NÃO UTILIZADOS:');
      unusedComponents.forEach(comp => {
        console.log(`   - ${comp.name} (${comp.file})`);
      });
    } else {
      console.log('✅ Todos os componentes parecem estar em uso!');
    }
    
    // 4. Detectar arquivos grandes
    console.log('\n📊 ANÁLISE DE TAMANHO DE ARQUIVOS:');
    const largeFiles = srcFiles
      .map(file => ({
        path: path.relative(projectRoot, file),
        size: fs.statSync(file).size
      }))
      .filter(file => file.size > 50000) // > 50KB
      .sort((a, b) => b.size - a.size);
    
    if (largeFiles.length > 0) {
      console.log('📈 Arquivos grandes (>50KB):');
      largeFiles.forEach(file => {
        console.log(`   - ${file.path}: ${(file.size / 1024).toFixed(1)}KB`);
      });
    } else {
      console.log('✅ Nenhum arquivo muito grande encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro na análise de código:', error.message);
  }
  
  console.log('\n');
}

// ============================================================================
// 🔧 3. ANÁLISE DE PERFORMANCE E BUNDLE
// ============================================================================

async function auditPerformance() {
  console.log('🔧 3. ANÁLISE DE PERFORMANCE E BUNDLE');
  console.log('='.repeat(50));
  
  try {
    // Verificar se build funciona
    console.log('🏗️  Testando build do projeto...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
      console.log('✅ Build executado com sucesso!');
      
      // Analisar tamanho do bundle
      const distPath = path.join(projectRoot, 'dist');
      if (fs.existsSync(distPath)) {
        const bundleFiles = fs.readdirSync(distPath, { recursive: true })
          .filter(file => file.toString().endsWith('.js') || file.toString().endsWith('.css'))
          .map(file => {
            const fullPath = path.join(distPath, file.toString());
            return {
              name: file.toString(),
              size: fs.statSync(fullPath).size
            };
          })
          .sort((a, b) => b.size - a.size);
        
        console.log('\n📦 TAMANHOS DO BUNDLE:');
        bundleFiles.forEach(file => {
          const sizeKB = (file.size / 1024).toFixed(1);
          const sizeStatus = file.size > 500000 ? '⚠️ ' : '✅ ';
          console.log(`   ${sizeStatus}${file.name}: ${sizeKB}KB`);
        });
        
        const totalSize = bundleFiles.reduce((sum, file) => sum + file.size, 0);
        console.log(`\n📊 Total bundle size: ${(totalSize / 1024).toFixed(1)}KB`);
        
        if (totalSize > 2000000) { // 2MB
          console.log('⚠️  Bundle muito grande - considere code splitting!');
        }
      }
      
    } catch (error) {
      console.log('❌ Erro no build - projeto precisa de correções!');
    }
    
    // Verificar TypeScript
    console.log('\n🔷 Verificando tipos TypeScript...');
    try {
      execSync('npx tsc --noEmit', { cwd: projectRoot, stdio: 'pipe' });
      console.log('✅ Tipos TypeScript OK!');
    } catch (error) {
      console.log('⚠️  Encontrados erros de tipo - execute: npx tsc --noEmit');
    }
    
    // Verificar linting
    console.log('\n🔍 Verificando ESLint...');
    try {
      execSync('npm run lint', { cwd: projectRoot, stdio: 'pipe' });
      console.log('✅ Linting passou!');
    } catch (error) {
      console.log('⚠️  Encontrados problemas de linting - execute: npm run lint');
    }
    
  } catch (error) {
    console.error('❌ Erro na análise de performance:', error.message);
  }
  
  console.log('\n');
}

// ============================================================================
// 🔗 4. ANÁLISE DE ESTRUTURA E ARQUITETURA
// ============================================================================

async function auditArchitecture() {
  console.log('🔗 4. ANÁLISE DE ESTRUTURA E ARQUITETURA');
  console.log('='.repeat(50));
  
  try {
    // Analisar estrutura de pastas
    const srcPath = path.join(projectRoot, 'src');
    const folders = fs.readdirSync(srcPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log('📁 ESTRUTURA DE PASTAS:');
    folders.forEach(folder => {
      const folderPath = path.join(srcPath, folder);
      const fileCount = getAllJsFiles(folderPath).length;
      console.log(`   - ${folder}: ${fileCount} arquivos`);
    });
    
    // Verificar importações circulares (básico)
    console.log('\n🔄 Verificando importações circulares...');
    const allFiles = getAllJsFiles(srcPath);
    const importGraph = new Map();
    
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(srcPath, file);
      const imports = [];
      
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      importMatches.forEach(match => {
        const pathMatch = match.match(/['"]([^'"]+)['"]/);
        if (pathMatch && pathMatch[1].startsWith('.')) {
          imports.push(pathMatch[1]);
        }
      });
      
      importGraph.set(relativePath, imports);
    });
    
    // Detectar possíveis importações circulares (simplificado)
    let circularImports = 0;
    importGraph.forEach((imports, file) => {
      imports.forEach(imp => {
        const resolvedPath = path.resolve(path.dirname(path.join(srcPath, file)), imp);
        const relativeImported = path.relative(srcPath, resolvedPath);
        
        if (importGraph.has(relativeImported)) {
          const backImports = importGraph.get(relativeImported) || [];
          backImports.forEach(backImp => {
            const backResolved = path.resolve(path.dirname(path.join(srcPath, relativeImported)), backImp);
            const backRelative = path.relative(srcPath, backResolved);
            if (backRelative === file) {
              circularImports++;
            }
          });
        }
      });
    });
    
    if (circularImports > 0) {
      console.log(`⚠️  Possíveis importações circulares detectadas: ${circularImports}`);
    } else {
      console.log('✅ Nenhuma importação circular óbvia detectada!');
    }
    
    // Analisar complexidade de arquivos
    console.log('\n📊 ANÁLISE DE COMPLEXIDADE:');
    const complexFiles = allFiles
      .map(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        const functions = (content.match(/function\s+\w+|=>\s*{|const\s+\w+\s*=/g) || []).length;
        return {
          file: path.relative(projectRoot, file),
          lines,
          functions
        };
      })
      .filter(file => file.lines > 200 || file.functions > 10)
      .sort((a, b) => b.lines - a.lines);
    
    if (complexFiles.length > 0) {
      console.log('📈 Arquivos complexos (>200 linhas ou >10 funções):');
      complexFiles.slice(0, 5).forEach(file => {
        console.log(`   - ${file.file}: ${file.lines} linhas, ${file.functions} funções`);
      });
    } else {
      console.log('✅ Nenhum arquivo excessivamente complexo!');
    }
    
  } catch (error) {
    console.error('❌ Erro na análise de arquitetura:', error.message);
  }
  
  console.log('\n');
}

// ============================================================================
// 📊 5. RELATÓRIO FINAL E RECOMENDAÇÕES
// ============================================================================

async function generateReport() {
  console.log('📊 5. RELATÓRIO FINAL E RECOMENDAÇÕES');
  console.log('='.repeat(50));
  
  const report = {
    timestamp: new Date().toISOString(),
    recommendations: []
  };
  
  console.log('💡 RECOMENDAÇÕES GERAIS:');
  console.log('');
  console.log('🔄 ROTINA SUGERIDA:');
  console.log('   1. Execute esta auditoria semanalmente');
  console.log('   2. Remova dependencies não utilizadas');
  console.log('   3. Refatore componentes grandes (>200 linhas)');
  console.log('   4. Monitore tamanho do bundle');
  console.log('   5. Execute testes automatizados antes de deploy');
  console.log('');
  console.log('⚡ PRÓXIMOS PASSOS:');
  console.log('   1. Implementar testes automatizados');
  console.log('   2. Configurar CI/CD pipeline');
  console.log('   3. Adicionar bundle analyzer');
  console.log('   4. Implementar code splitting');
  console.log('   5. Configurar performance monitoring');
  
  // Salvar relatório
  const reportPath = path.join(projectRoot, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
}

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

function getAllJsFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
      files.push(...getAllJsFiles(fullPath));
    } else if (item.isFile() && /\.(js|jsx|ts|tsx)$/.test(item.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

async function runAudit() {
  const startTime = Date.now();
  
  console.log('🎯 MYWORKFLOWS - AUDITORIA COMPLETA');
  console.log('📅 Data:', new Date().toLocaleString());
  console.log('📂 Projeto:', projectRoot);
  console.log('\n');
  
  await auditDependencies();
  await auditUnusedCode();
  await auditPerformance();
  await auditArchitecture();
  await generateReport();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ AUDITORIA CONCLUÍDA em ${duration}s`);
  console.log('🔄 Execute novamente em 1 semana!');
}

// Execute se for o script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit().catch(console.error);
}

export default runAudit;