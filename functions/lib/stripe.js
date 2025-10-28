"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.processStripePayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// Initialize Stripe SDK with secret key from Firebase environment config
// To set this value:
// firebase functions:config:set stripe.secret="your_stripe_secret_key"
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-04-10',
});
/**
 * Creates a Stripe PaymentIntent for a given transaction.
 */
exports.processStripePayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { tenantId, transactionId, amount, currency } = request.data;
    if (!tenantId || !transactionId || !amount || !currency) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data fields.');
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
    }
    catch (error) {
        console.error('Stripe PaymentIntent creation failed:', error);
        await admin.firestore().collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'stripePaymentIntent',
            result: 'error',
            transactionId: transactionId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new https_1.HttpsError('internal', 'An error occurred while creating the payment intent.', error.message);
    }
});
/**
 * Handles incoming webhooks from Stripe to confirm payment success.
 */
exports.stripeWebhook = (0, https_1.onRequest)(async (req, res) => {
    let event;
    try {
        // Use the raw body to construct the event
        const signature = req.headers['stripe-signature'];
        // Get the webhook secret from Firebase config
        // firebase functions:config:set stripe.webhook_secret="your_webhook_signing_secret"
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle the payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
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
        }
        catch (error) {
            console.error(`Failed to update payment ${paymentId} for tenant ${tenantId}`, error);
            // The webhook will be retried by Stripe, so we send a 500 to indicate failure.
            res.sendStatus(500);
            return;
        }
    }
    // Acknowledge receipt of the event
    res.json({ received: true });
});
//# sourceMappingURL=stripe.js.map