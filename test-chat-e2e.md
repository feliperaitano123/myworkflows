# Chat E2E Test Checklist

## 1. Conexão WebSocket
- [ ] Frontend conecta ao WebSocket server
- [ ] Autenticação JWT é validada
- [ ] Mensagem "connected" é recebida

## 2. Carregamento de Histórico
- [ ] Histórico é solicitado ao conectar
- [ ] Loading indicator aparece durante carregamento
- [ ] Mensagens anteriores são exibidas corretamente
- [ ] Não há duplicação de mensagens

## 3. Envio de Mensagens
- [ ] Usuário pode enviar mensagem
- [ ] Mensagem aparece imediatamente na UI
- [ ] Mensagem é salva no banco (message_saved)
- [ ] Tokens de input são calculados

## 4. Streaming de Respostas
- [ ] Resposta do AI aparece com streaming
- [ ] Tokens aparecem progressivamente
- [ ] Indicador de "digitando" durante streaming
- [ ] Mensagem completa é salva após streaming

## 5. Tool Calls (MCP)
- [ ] Detecta quando precisa buscar workflow
- [ ] Mostra indicador de tool em execução
- [ ] Tool getWorkflow retorna dados corretos
- [ ] Resultado é incorporado na resposta

## 6. Troca de Workflows
- [ ] Estado é limpo ao trocar workflow
- [ ] Novo histórico é carregado
- [ ] Não há contaminação entre workflows
- [ ] Session é atualizada corretamente

## 7. Clear Chat
- [ ] Botão clear chat funciona
- [ ] Mensagens são removidas da UI
- [ ] Banco de dados é limpo
- [ ] Novo chat pode ser iniciado

## 8. Seleção de Modelos
- [ ] Dropdown mostra modelos disponíveis
- [ ] Modelo selecionado é usado nas requisições
- [ ] Modelo é salvo no metadata das mensagens

## 9. Indicadores Visuais
- [ ] Status de conexão (verde/vermelho)
- [ ] Loading durante operações
- [ ] Animações de entrada de mensagens
- [ ] Scroll automático funciona

## 10. Tratamento de Erros
- [ ] Erro de conexão mostra mensagem
- [ ] Falha no OpenRouter usa mock fallback
- [ ] Erros são logados no console
- [ ] UI permanece funcional após erros

## Comandos de Teste

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd ..
npm run dev

# Abrir browser em http://localhost:8081
```

## Cenários de Teste

### Teste 1: Chat Básico
1. Login na aplicação
2. Navegar para um workflow
3. Enviar "Olá"
4. Verificar resposta do AI

### Teste 2: Tool Call
1. Enviar "Me mostre os detalhes deste workflow"
2. Verificar execução da tool getWorkflow
3. Confirmar dados do workflow na resposta

### Teste 3: Persistência
1. Enviar várias mensagens
2. Recarregar a página (F5)
3. Verificar se histórico é mantido

### Teste 4: Múltiplos Workflows
1. Conversar no Workflow A
2. Trocar para Workflow B
3. Verificar históricos separados
4. Voltar para Workflow A
5. Confirmar histórico preservado