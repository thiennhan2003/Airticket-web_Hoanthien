import Stripe from 'stripe';
import { env } from '../helpers/env.helper';

const stripe = new Stripe(env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
});

// Tỷ giá VND sang USD (cố định để đơn giản hóa)
const VND_TO_USD_RATE = 0.000043; // 1 VND = 0.000043 USD

interface PaymentData {
  amount: number; // Amount in VND
  currency: string;
  ticketId: string;
  customerEmail: string;
  description: string;
}

interface RefundData {
  paymentIntentId: string;
  amount?: number; // Partial refund amount in cents, if not provided, full refund
  reason?: string;
}

class PaymentService {
  /**
   * Create a payment intent for ticket booking
   */
  async createPaymentIntent(paymentData: PaymentData) {
    try {
      // Convert VND to USD if currency is VND
      let amountInCents: number;
      if (paymentData.currency.toLowerCase() === 'vnd') {
        // Convert VND to USD and then to cents
        const amountInUSD = paymentData.amount * VND_TO_USD_RATE;
        amountInCents = Math.round(amountInUSD * 100); // Convert to cents
      } else {
        // For other currencies, assume amount is already in the smallest unit
        amountInCents = paymentData.amount;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd', // Stripe always uses USD
        metadata: {
          ticketId: paymentData.ticketId,
          customerEmail: paymentData.customerEmail,
          originalAmount: paymentData.amount.toString(),
          originalCurrency: paymentData.currency,
        },
        description: paymentData.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        originalAmount: paymentData.amount,
        originalCurrency: paymentData.currency,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment intent (after successful payment)
   */
  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          originalAmount: paymentIntent.metadata?.originalAmount,
          originalCurrency: paymentIntent.metadata?.originalCurrency,
          status: paymentIntent.status,
        };
      }

      return {
        success: false,
        status: paymentIntent.status,
        message: 'Payment not completed',
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  /**
   * Process refund for a ticket
   */
  async processRefund(refundData: RefundData) {
    try {
      console.log('🔄 Processing refund for payment intent:', refundData.paymentIntentId);

      // First, get the payment intent to check refundable amount
      const paymentIntent = await stripe.paymentIntents.retrieve(refundData.paymentIntentId);
      console.log('✅ Payment intent found:', paymentIntent.id, 'Status:', paymentIntent.status);

      if (paymentIntent.status !== 'succeeded') {
        console.error('❌ Payment intent not succeeded:', paymentIntent.status);
        throw new Error('Can only refund succeeded payments');
      }

      // Create refund
      console.log('💰 Creating refund...');
      const refund = await stripe.refunds.create({
        payment_intent: refundData.paymentIntentId,
        amount: refundData.amount, // If not provided, full refund
        reason: 'requested_by_customer', // Stripe chỉ chấp nhận: duplicate, fraudulent, requested_by_customer
        metadata: {
          ticketId: paymentIntent.metadata?.ticketId || 'unknown',
          originalReason: refundData.reason || 'Customer requested cancellation'
        },
      });

      console.log('✅ Refund created successfully:', refund.id);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        paymentIntentId: refundData.paymentIntentId,
      };
    } catch (error: any) {
      console.error('❌ Stripe refund error:', {
        message: error.message,
        type: error.type,
        code: error.code,
        paymentIntentId: refundData.paymentIntentId
      });
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Get payment details by payment intent ID
   */
  async getPaymentDetails(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata,
        originalAmount: paymentIntent.metadata?.originalAmount,
        originalCurrency: paymentIntent.metadata?.originalCurrency,
      };
    } catch (error) {
      console.error('Error getting payment details:', error);
      throw new Error('Failed to get payment details');
    }
  }

  /**
   * Webhook signature verification (for production use)
   */
  constructEvent(payload: Buffer, signature: string, webhookSecret: string) {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export default new PaymentService();
