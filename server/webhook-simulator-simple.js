#!/usr/bin/env node

/**
 * Simulador SIMPLES de webhooks do Stripe usando apenas Node.js nativo
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

const WEBHOOK_URL = 'http://localhost:3002/api/billing/webhook';
const WEBHOOK_SECRET = 'whsec_test_webhook_secret_for_local_development';

// Função para criar signature do Stripe
function createStripeSignature(payloadString, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
    
  return `t=${timestamp},v1=${signature}`;
}

// Função para fazer POST request
function makePostRequest(url, data, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Simular checkout completed
async function simulateCheckoutCompleted(userId = 'test-user-123', planType = 'pro') {
  const event = {
    id: 'evt_test_checkout_completed',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_checkout_session',
        customer: 'cus_test_customer',
        subscription: 'sub_test_subscription',
        amount_total: 2000, // $20.00
        metadata: {
          userId: userId,
          planType: planType
        }
      }
    }
  };

  const payloadString = JSON.stringify(event);
  const signature = createStripeSignature(payloadString, WEBHOOK_SECRET);
  
  try {
    const response = await makePostRequest(WEBHOOK_URL, event, {
      'stripe-signature': signature
    });
    
    console.log('✅ Checkout completed webhook sent. Status:', response.status);
    console.log('📦 Response:', response.data);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    console.error('Full error:', error);
  }
}

// Simular subscription updated
async function simulateSubscriptionUpdated() {
  const event = {
    id: 'evt_test_subscription_updated',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_subscription',
        customer: 'cus_test_customer',
        status: 'active'
      }
    }
  };

  const payloadString = JSON.stringify(event);
  const signature = createStripeSignature(payloadString, WEBHOOK_SECRET);
  
  try {
    const response = await makePostRequest(WEBHOOK_URL, event, {
      'stripe-signature': signature
    });
    
    console.log('✅ Subscription updated webhook sent. Status:', response.status);
    console.log('📦 Response:', response.data);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    console.error('Full error:', error);
  }
}

// Script principal
async function main() {
  const command = process.argv[2];
  const userId = process.argv[3] || 'test-user-123';
  const planType = process.argv[4] || 'pro';
  
  console.log(`🔔 Sending Stripe webhook to: ${WEBHOOK_URL}`);
  console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 20)}...`);
  
  switch (command) {
    case 'checkout':
      console.log(`👤 User: ${userId}, Plan: ${planType}`);
      await simulateCheckoutCompleted(userId, planType);
      break;
    case 'subscription':
      await simulateSubscriptionUpdated();
      break;
    default:
      console.log(`
📚 Usage:
  node server/webhook-simulator-simple.js checkout [userId] [planType]
  node server/webhook-simulator-simple.js subscription

Examples:
  node server/webhook-simulator-simple.js checkout user-123 pro
  node server/webhook-simulator-simple.js subscription
      `);
  }
}

main().catch(console.error);