const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001?token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImNlbVFXQ1ZqMGhXY1JFTC…HNlfQ.tyYMH8kukrih86prf2B7stw2FlRtNqPo96QU5fTRakw');

ws.on('open', function open() {
  console.log('🔗 Conectado ao WebSocket');
  
  // Enviar mensagem de teste
  const testMessage = {
    type: 'chat',
    content: 'Olá, teste simples',
    workflowId: 'some-workflow-id'
  };
  
  console.log('📤 Enviando mensagem:', testMessage);
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  const msg = JSON.parse(data.toString());
  console.log('📥 Recebido:', msg);
});

ws.on('error', function error(err) {
  console.error('❌ Erro WebSocket:', err);
});

ws.on('close', function close() {
  console.log('🔌 Conexão fechada');
});