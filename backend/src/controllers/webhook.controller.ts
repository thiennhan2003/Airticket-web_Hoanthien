import { Request, Response, NextFunction } from 'express';
import paymentService from '../services/payment.service';
import ticketsService from '../services/tickets.service';

/**
 * Webhook Controller
 * Handles Stripe webhook events for automatic payment status updates
 */

// Handle Stripe webhook events
const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    if (!sig || !endpointSecret) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing stripe signature or webhook secret'
      });
    }

    let event;

    try {
      // Verify webhook signature
      event = paymentService.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).json({
        statusCode: 400,
        message: 'Webhook signature verification failed'
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    next(error);
  }
};

// Handle successful payment intent
const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
  try {
    console.log('✅ Payment intent succeeded:', paymentIntent.id);

    // Get ticket ID from payment intent metadata
    const ticketId = paymentIntent.metadata?.ticketId;

    if (!ticketId) {
      console.error('No ticket ID found in payment intent metadata');
      return;
    }

    // Update ticket status to paid
    await ticketsService.updateById(ticketId.toString(), {
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntent.id
    });

    // Get updated ticket for email
    const ticket = await ticketsService.getById(ticketId);

    if (ticket) {
      // Send confirmation email (import email service if needed)
      console.log(`✅ Ticket ${ticketId} marked as paid`);
    }

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
};

// Handle failed payment intent
const handlePaymentIntentFailed = async (paymentIntent: any) => {
  try {
    console.log('❌ Payment intent failed:', paymentIntent.id);

    const ticketId = paymentIntent.metadata?.ticketId;

    if (!ticketId) {
      console.error('No ticket ID found in payment intent metadata');
      return;
    }

    // Update ticket status to failed
    await ticketsService.updateById(ticketId.toString(), {
      paymentStatus: 'failed',
      paymentFailureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
    });

    console.log(`❌ Ticket ${ticketId} marked as failed`);

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
};

// Handle charge disputes
const handleChargeDispute = async (charge: any) => {
  try {
    console.log('⚠️ Charge dispute created:', charge.id);

    // Find ticket by payment intent ID
    const ticket = await ticketsService.getByPaymentIntentId(charge.payment_intent.toString());

    if (ticket) {
      // Update ticket status to disputed
      await ticketsService.updateById(ticket._id.toString(), {
        paymentStatus: 'disputed',
        disputeId: charge.id,
        disputedAt: new Date()
      });

      console.log(`⚠️ Ticket ${ticket._id} marked as disputed`);
    }

  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
};

export default {
  handleWebhook,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleChargeDispute
};
