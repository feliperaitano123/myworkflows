const WebSocket = require('ws');

// Test WebSocket connection and basic chat flow
async function testChatFlow() {
  console.log('🧪 Starting E2E Chat Test...\n');

  // You'll need a valid JWT token from a logged-in user
  // For testing, you can get this from browser DevTools after logging in
  const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE';
  const TEST_WORKFLOW_ID = 'test-workflow-123';
  
  try {
    // 1. Test Connection
    console.log('1️⃣ Testing WebSocket connection...');
    const ws = new WebSocket(`ws://localhost:3001?token=${TEST_TOKEN}`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ Connected to WebSocket server');
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('❌ Connection error:', error.message);
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // 2. Test History Request
    console.log('\n2️⃣ Testing history request...');
    ws.send(JSON.stringify({
      type: 'get_history',
      workflowId: TEST_WORKFLOW_ID,
      limit: 10
    }));

    // 3. Test Chat Message
    console.log('\n3️⃣ Testing chat message...');
    ws.send(JSON.stringify({
      type: 'chat',
      content: 'Hello, this is a test message!',
      workflowId: TEST_WORKFLOW_ID,
      model: 'anthropic/claude-3-haiku'
    }));

    // Listen for responses
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received: ${message.type}`);
      
      switch (message.type) {
        case 'connected':
          console.log('  ✅ Connection confirmed');
          break;
        case 'history':
          console.log(`  📚 History: ${message.history?.length || 0} messages`);
          break;
        case 'message_saved':
          console.log(`  💾 Message saved: ${message.message?.id}`);
          break;
        case 'token':
          process.stdout.write('.');
          break;
        case 'complete':
          console.log('\n  ✅ Response complete');
          setTimeout(() => {
            ws.close();
            console.log('\n🎉 All tests passed!');
            process.exit(0);
          }, 1000);
          break;
        case 'error':
          console.error(`  ❌ Error: ${message.error}`);
          break;
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      console.error('\n❌ Test timeout - no complete response received');
      ws.close();
      process.exit(1);
    }, 30000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testChatFlow().catch(console.error);

console.log(`
⚠️  Before running this test:
1. Start the backend server: npm run dev
2. Get a valid JWT token from a logged-in session
3. Update TEST_TOKEN in this file
4. Run: node test-websocket.js
`);