import 'dotenv/config';
import { AIWebSocketServer } from './websocket-server';

const PORT = parseInt(process.env.PORT || '3001');

// Validar variáveis de ambiente essenciais
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
  process.exit(1);
}

// Criar e iniciar servidor
const server = new AIWebSocketServer(PORT);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, iniciando shutdown...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, iniciando shutdown...');
  await server.shutdown();
  process.exit(0);
});

// Log de estatísticas a cada 30 segundos
setInterval(() => {
  const stats = server.getStats();
  console.log(`📊 Stats: ${stats.activeConnections} conexões ativas, ${stats.activeSessions} sessões, uptime: ${Math.floor(stats.uptime)}s`);
}, 30000);