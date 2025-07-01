import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export class StripeService {
  
  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(params: {
    priceId: string;
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer: params.customerId,
        metadata: params.metadata,
        subscription_data: {
          metadata: params.metadata,
        },
      });

      return session;
    } catch (error) {
      console.error('❌ Erro ao criar checkout session:', error);
      throw error;
    }
  }

  /**
   * Create or retrieve customer
   */
  static async createOrGetCustomer(params: {
    email: string;
    name?: string;
    userId: string;
  }) {
    try {
      // Try to find existing customer
      const existingCustomers = await stripe.customers.list({
        email: params.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          userId: params.userId,
        },
      });

      return customer;
    } catch (error) {
      console.error('❌ Erro ao criar/buscar customer:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session
   */
  static async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      return session;
    } catch (error) {
      console.error('❌ Erro ao criar portal session:', error);
      throw error;
    }
  }

  /**
   * Retrieve subscription
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('❌ Erro ao buscar subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('❌ Erro ao cancelar subscription:', error);
      throw error;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(
    body: Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      return event;
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw error;
    }
  }
}

export default StripeService;