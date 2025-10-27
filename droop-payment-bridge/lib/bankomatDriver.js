const net = require('net');
const { sendCallback } = require('./firebaseClient');

/**
 * --- STUB FUNCTION ---
 * This function simulates initiating a payment on a local hardware device
 * using a TCP socket connection. In a real-world scenario, this is where you
 * would implement the specific protocol (e.g., ZVT, OPI) required by your
 * payment terminal.
 *
 * @param {object} paymentData - The data for the payment.
 * @param {number} paymentData.amount - The payment amount.
 * @param {string} paymentData.transactionId - The ERP's transaction ID.
 * @param {string} paymentData.tenantId - The tenant ID.
 * @param {string} paymentData.paymentId - The ERP's payment ID.
 * @param {string} paymentData.callbackUrl - The URL to call upon completion.
 */
async function startPaymentOnDevice(paymentData) {
  const { amount, transactionId, tenantId, paymentId, callbackUrl } = paymentData;
  const terminalIp = process.env.TERMINAL_IP;
  const terminalPort = process.env.TERMINAL_PORT;

  console.log(`[STUB] Connecting to terminal at ${terminalIp}:${terminalPort}`);

  // This is a placeholder for the real implementation.
  // We'll simulate a successful payment after a short delay.
  const isPaymentSuccessful = Math.random() > 0.1; // 90% success rate

  console.log(`[STUB] Simulating a transaction for amount: ${amount}`);

  setTimeout(async () => {
    const status = isPaymentSuccessful ? 'completed' : 'failed';
    const deviceResponse = {
      terminalId: 'T-12345',
      timestamp: new Date().toISOString(),
      maskedPan: '4111********1111',
      authCode: isPaymentSuccessful ? '0123AB' : null,
      errorCode: isPaymentSuccessful ? null : 'E-51',
      errorMessage: isPaymentSuccessful ? null : 'Insufficient funds'
    };

    console.log(`[STUB] Payment simulation finished with status: ${status}`);

    // After the device interaction is complete, send the result back to the main ERP.
    await sendCallback({
      tenantId,
      paymentId,
      status,
      deviceResponse,
      callbackUrl
    });

  }, 5000); // Simulate a 5-second transaction time.
}

module.exports = { startPaymentOnDevice };
