
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from './types';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe SDK with secret key from Firebase environment config
// To set this value:
// firebase functions:config:set stripe.secret="your_stripe_secret_key"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

/**
 * Creates a Stripe PaymentIntent for a given transaction.
 */
export const processStripePayment = onCall(async (request: CallableRequest<AnyData>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { tenantId, transactionId, amount, currency } = request.data as { tenantId?: string; transactionId?: string; amount?: number; currency?: string };
  if (!tenantId || !transactionId || !amount || !currency) {
    throw new HttpsError('invalid-argument', 'Missing required data fields.');
  }
  
  // Convert amount to cents for Stripe
  const amountInCents = Math.round(amount * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: {
        tenantId,
        transactionId,
  paymentId: request.data.paymentId // The paymentId created on the client
      },
    });

    // Log the creation of the payment intent
    await admin.firestore().collection(`tenants/${tenantId}/auditLogs`).add({
        type: 'stripePaymentIntent',
        result: 'success',
        transactionId: transactionId,
        paymentIntentId: paymentIntent.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { clientSecret: paymentIntent.client_secret };

  } catch (error: any) {
    console.error('Stripe PaymentIntent creation failed:', error);
     await admin.firestore().collection(`tenants/${tenantId}/auditLogs`).add({
        type: 'stripePaymentIntent',
        result: 'error',
        transactionId: transactionId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    throw new HttpsError('internal', 'An error occurred while creating the payment intent.', error.message);
  }
});


/**
 * Handles incoming webhooks from Stripe to confirm payment success.
 */
export const stripeWebhook = onRequest(async (req, res) => {
    let event: Stripe.Event;

    try {
        // Use the raw body to construct the event
        const signature = req.headers['stripe-signature'] as string;
        // Get the webhook secret from Firebase config
        // firebase functions:config:set stripe.webhook_secret="your_webhook_signing_secret"
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
        console.error('Webhook signature verification failed.', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { tenantId, paymentId } = paymentIntent.metadata;

        if (!tenantId || !paymentId) {
             console.error('Webhook received with missing metadata:', paymentIntent.id);
             res.status(400).send('Missing tenantId or paymentId in metadata.');
             return;
        }

        const firestore = admin.firestore();
        const paymentRef = firestore.doc(`tenants/${tenantId}/payments/${paymentId}`);

        try {
            await paymentRef.update({
                status: 'completed',
                stripePaymentIntentId: paymentIntent.id
            });
            
             await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
                type: 'stripeWebhook',
                result: 'success',
                paymentId: paymentId,
                paymentIntentId: paymentIntent.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Successfully updated payment ${paymentId} for tenant ${tenantId}`);
        } catch (error) {
            console.error(`Failed to update payment ${paymentId} for tenant ${tenantId}`, error);
            // The webhook will be retried by Stripe, so we send a 500 to indicate failure.
            res.sendStatus(500);
            return;
        }
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
});
