import crypto from 'crypto';

const userId = process.argv[2] || 'test-user-123';
const planType = process.argv[3] || 'pro';

// Simular dados do Stripe checkout.session.completed
const sessionData = {
  id: 'cs_test_webhook_session',
  object: 'checkout.session',
  customer: 'cus_test_customer',
  subscription: 'sub_test_subscription',
  amount_total: 2000, // $20.00
  payment_status: 'paid',
  metadata: {
    userId: userId,
    planType: planType
  }
};

const event = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: sessionData
  }
};

const payload = JSON.stringify(event);
const signature = crypto
  .createHmac('sha256', 'whsec_test_webhook_secret')
  .update(payload, 'utf8')
  .digest('hex');

console.log(`🔔 Testing webhook for user: ${userId}, plan: ${planType}`);

fetch('http://localhost:3002/api/billing/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
  },
  body: payload
})
.then(response => {
  console.log(`✅ Webhook response status: ${response.status}`);
  return response.text();
})
.then(text => {
  console.log(`📦 Response: ${text}`);
})
.catch(error => {
  console.error(`❌ Error: ${error.message}`);
});