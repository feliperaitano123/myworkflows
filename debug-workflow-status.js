// Script para debug do status dos workflows
console.log('🔍 Verificando status dos workflows no banco...');

// Simular uma consulta para verificar como está o campo active
const sampleData = {
  workflows: [
    { id: '1', workflow_id: 'workflow_123', name: 'Test Workflow 1', active: true },
    { id: '2', workflow_id: 'workflow_456', name: 'Test Workflow 2', active: false },
    { id: '3', workflow_id: 'workflow_789', name: 'Test Workflow 3', active: null }
  ]
};

console.log('📊 Dados de exemplo dos workflows:');
sampleData.workflows.forEach(workflow => {
  const isActive = workflow.active || false;
  const color = isActive ? 'VERDE' : 'VERMELHO';
  console.log(`- ${workflow.name}: active=${workflow.active} → isActive=${isActive} → ${color}`);
});

console.log('\n🎯 Se todos estão vermelhos, o problema pode ser:');
console.log('1. Campos active estão como false no banco');
console.log('2. Sincronização não está atualizando o banco');
console.log('3. Frontend não está refrescando após sync');