
import { onCall, HttpsError } from "firebase-functions/v2/https";
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
export const processStripePayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { tenantId, transactionId, amount, currency } = request.data;
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
