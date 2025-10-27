
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { startPaymentOnDevice } = require('./lib/bankomatDriver');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const admin = require('firebase-admin');

// --- Firebase Admin SDK Setup ---
// Initialize Firebase Admin. It will automatically use the service account credentials
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable.
try {
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
    process.exit(1);
}

const app = express();
const port = process.env.SERVER_PORT || 7070;

// --- Logger Setup ---
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'payment-bridge' },
  transports: [
    new transports.File({ filename: path.join(__dirname, 'logs/error.log'), level: 'error' }),
    new transports.File({ filename: path.join(__dirname, 'logs/combined.log') }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// --- Middleware ---
app.use(bodyParser.json());
app.use(cors()); // In a real production environment, restrict this to the ERP's domain

// --- Authentication Middleware ---
// This middleware will protect all routes defined after it.
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
        logger.warn('Unauthorized access attempt: No token provided.');
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    try {
        // Verify the ID token using the Firebase Admin SDK.
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Optionally attach user info to the request
        logger.info(`Authenticated request for UID: ${decodedToken.uid}`);
        next(); // Token is valid, proceed to the next handler
    } catch (error) {
        logger.error('Authentication error: Invalid token.', { errorMessage: error.message });
        return res.status(401).json({ error: "Unauthorized: Invalid token." });
    }
};

// --- Routes ---

// Health check endpoint (publicly accessible, defined before auth middleware)
app.get('/api/health', (req, res) => {
  logger.info('Health check endpoint hit');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply authentication middleware to all subsequent API routes
app.use('/api', authMiddleware);

/**
 * Endpoint to start a payment on the physical device.
 * This is called by the main ERP's Cloud Function.
 */
app.post('/api/payment/device/start', async (req, res) => {
  const { tenantId, transactionId, paymentId, amount, callbackUrl } = req.body;

  if (!tenantId || !transactionId || !paymentId || !amount || !callbackUrl) {
    logger.warn('Received invalid payment request', { body: req.body });
    return res.status(400).json({ error: 'Missing required payment parameters.' });
  }

  logger.info(`Starting payment for transactionId: ${transactionId}`, { amount, paymentId });

  try {
    // This function contains the hardware-specific logic.
    // It is designed to be asynchronous and will handle the callback internally.
    await startPaymentOnDevice({
      amount,
      transactionId,
      tenantId,
      paymentId,
      callbackUrl
    });

    // Immediately respond to the cloud function that the process has started.
    res.status(202).json({
      status: 'initiated',
      message: 'Payment process has been initiated on the terminal.'
    });

  } catch (error) {
    logger.error('Failed to initiate payment on device', { error: error.message, stack: error.stack, transactionId });
    res.status(500).json({ error: 'Failed to communicate with the payment terminal.' });
  }
});

// --- Server Start ---
app.listen(port, () => {
  logger.info(`Droop Payment Bridge listening on port ${port}`);
});
