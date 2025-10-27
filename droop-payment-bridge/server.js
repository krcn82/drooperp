require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { startPaymentOnDevice } = require('./lib/bankomatDriver');
const { createLogger, format, transports } = require('winston');
const path = require('path');

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

// --- Routes ---

// Health check endpoint
app.get('/api/health', (req, res) => {
  logger.info('Health check endpoint hit');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
