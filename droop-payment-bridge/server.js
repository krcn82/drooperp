
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
  const { tenantId, transactionId, paymentId, amount } = req.body;

  if (!tenantId || !transactionId || !paymentId || !amount) {
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
      paymentId
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

/**
 * Endpoint to receive a daily summary and trigger a local print job.
 */
app.post('/api/payment/device/summary', async (req, res) => {
  const { tenantId, totalCash, totalCard, totalBankomat, closingBalance } = req.body;

  if (!tenantId || totalCash === undefined || totalCard === undefined || totalBankomat === undefined || closingBalance === undefined) {
    logger.warn('Received invalid summary request', { body: req.body });
    return res.status(400).json({ error: 'Missing required summary parameters.' });
  }
  
  logger.info(`Received Z-Report summary for tenant ${tenantId}`, { body: req.body });

  try {
    // --- STUB for local printer integration ---
    // Here you would add logic to connect to a local receipt printer
    // (e.g., via serial port, USB, or a network-connected printer library)
    // and print the Z-Report summary.
    console.log("-----------------------------------------");
    console.log("           Z-REPORT (DAILY SUMMARY)      ");
    console.log(`Tenant: ${tenantId}`);
    console.log(`Date: ${new Date().toLocaleDateString()}`);
    console.log("-----------------------------------------");
    console.log(`Total Cash Sales:     €${totalCash.toFixed(2)}`);
    console.log(`Total Card Sales:     €${totalCard.toFixed(2)}`);
    console.log(`Total Bankomat Sales: €${totalBankomat.toFixed(2)}`);
    console.log("=========================================");
    console.log(`Closing Balance:      €${closingBalance.toFixed(2)}`);
    console.log("-----------------------------------------");
    
    res.status(200).json({ status: 'received', message: 'Summary received and sent to local printer.' });

  } catch (error) {
    logger.error('Failed to process summary for printing', { error: error.message, stack: error.stack, tenantId });
    res.status(500).json({ error: 'Failed to communicate with local printer.' });
  }
});


// --- Server Start ---
app.listen(port, () => {
  logger.info(`Droop Payment Bridge listening on port ${port}`);
});
