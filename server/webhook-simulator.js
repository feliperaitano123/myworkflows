#!/usr/bin/env node

/**
 * Simulador de webhooks do Stripe para desenvolvimento local
 * Como não temos Stripe CLI, este script simula webhooks para testar
 */

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:3002/api/billing/webhook';
const WEBHOOK_SECRET = 'whsec_test_webhook_secret_for_local_development';

// Função para criar signature do Stripe
function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
    
  return `t=${timestamp},v1=${signature}`;
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

  const signature = createStripeSignature(event, WEBHOOK_SECRET);
  
  try {
    const response = await axios.post(WEBHOOK_URL, event, {
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json'
      }
    });
    
    console.log('✅ Checkout completed webhook sent:', response.status);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
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

  const signature = createStripeSignature(event, WEBHOOK_SECRET);
  
  try {
    const response = await axios.post(WEBHOOK_URL, event, {
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json'
      }
    });
    
    console.log('✅ Subscription updated webhook sent:', response.status);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }
}

// Script principal
async function main() {
  const command = process.argv[2];
  const userId = process.argv[3] || 'test-user-123';
  const planType = process.argv[4] || 'pro';
  
  console.log(`🔔 Sending Stripe webhook to: ${WEBHOOK_URL}`);
  
  switch (command) {
    case 'checkout':
      await simulateCheckoutCompleted(userId, planType);
      break;
    case 'subscription':
      await simulateSubscriptionUpdated();
      break;
    default:
      console.log(`
📚 Usage:
  node webhook-simulator.js checkout [userId] [planType]
  node webhook-simulator.js subscription

Examples:
  node webhook-simulator.js checkout user-123 pro
  node webhook-simulator.js subscription
      `);
  }
}

main().catch(console.error);