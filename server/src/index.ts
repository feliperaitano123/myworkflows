import 'dotenv/config';
import { AIWebSocketServer } from './websocket-server';
import { APIServer } from './api-server';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');
const API_PORT = parseInt(process.env.API_PORT || '3002');

// Validar variáveis de ambiente essenciais
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
  process.exit(1);
}

// Criar servidores
const wsServer = new AIWebSocketServer(WS_PORT);
const apiServer = new APIServer(API_PORT);

// Inicializar API Server
async function startServers() {
  try {
    await apiServer.start();
    console.log(`✅ Servidores iniciados:`);
    console.log(`   🔌 WebSocket: porta ${WS_PORT}`);
    console.log(`   📡 REST API: porta ${API_PORT}`);
  } catch (error) {
    console.error('❌ Erro ao inicializar servidores:', error);
    process.exit(1);
  }
}

startServers();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, iniciando shutdown...');
  await Promise.all([
    wsServer.shutdown(),
    apiServer.shutdown()
  ]);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, iniciando shutdown...');
  await Promise.all([
    wsServer.shutdown(),
    apiServer.shutdown()
  ]);
  process.exit(0);
});

// Log de estatísticas a cada 30 segundos
setInterval(() => {
  const stats = wsServer.getStats();
  console.log(`📊 Stats: ${stats.activeConnections} conexões WS ativas, ${stats.activeSessions} sessões, uptime: ${Math.floor(stats.uptime)}s`);
}, 30000);