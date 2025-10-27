const net = require('net');
const { sendCallback } = require('./firebaseClient');

/**
 * --- STUB FUNCTION ---
 * This function simulates initiating a payment on a local hardware device
 * using a TCP socket connection. In a real-world scenario, this is where you
 * would implement the specific protocol (e.g., ZVT, OPI) required by your
 * payment terminal.
 *
 * This function is asynchronous and handles its own callback to the main ERP.
 *
 * @param {object} paymentData - The data for the payment.
 * @param {number} paymentData.amount - The payment amount.
 * @param {string} paymentData.transactionId - The ERP's transaction ID.
 * @param {string} paymentData.tenantId - The tenant ID.
 * @param {string} paymentData.paymentId - The ERP's payment ID.
 */
async function startPaymentOnDevice(paymentData) {
  const { amount, transactionId, tenantId, paymentId } = paymentData;
  const terminalIp = process.env.TERMINAL_IP || "192.168.1.50";
  const terminalPort = process.env.TERMINAL_PORT || 20007;

  console.log(`[STUB] Connecting to terminal at ${terminalIp}:${terminalPort}`);
  console.log(`🏧 Simulating Bankomat transaction: ${amount}€`);
  
  // 1️⃣ Burada gerçek cihazla iletişim kurulabilir
  //    TCP/IP protokolü üzerinden:
  //    const client = new net.Socket();
  //    client.connect(terminalPort, terminalIp);
  //    client.write("PAYMENT_START " + amount);
  //    client.on('data', ...)
  //    client.on('close', ...)

  // 2️⃣ Test için simülasyon:
  await new Promise((r) => setTimeout(r, 2000)); // bekleme efekti
  
  const isPaymentSuccessful = Math.random() > 0.05; // 95% success rate

  const status = isPaymentSuccessful ? 'completed' : 'failed';
  const deviceResponse = {
    message: isPaymentSuccessful ? "Approved" : "Declined",
    authCode: isPaymentSuccessful ? "A12345" : null,
    terminalId: "T001",
    timestamp: new Date().toISOString(),
  };

  console.log(`[STUB] Payment simulation finished with status: ${status}`);

  // After the device interaction is complete, send the result back to the main ERP.
  await sendCallback({
    tenantId,
    paymentId,
    status,
    deviceResponse,
  });
}

module.exports = { startPaymentOnDevice };
