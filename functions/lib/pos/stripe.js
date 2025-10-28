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
exports.processStripePayment = void 0;
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
//# sourceMappingURL=stripe.js.map