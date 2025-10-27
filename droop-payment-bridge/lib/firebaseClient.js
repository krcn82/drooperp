const fetch = require('node-fetch');

/**
 * Sends the result of the local payment transaction back to the
 * main ERP system's webhook endpoint (a Firebase Cloud Function).
 *
 * @param {object} callbackData - The data to send in the callback.
 * @param {string} callbackData.tenantId - The tenant ID.
 * @param {string} callbackData.paymentId - The ERP's payment ID.
 * @param {'completed' | 'failed'} callbackData.status - The final status of the payment.
 * @param {object} callbackData.deviceResponse - The raw response from the payment terminal.
 */
async function sendCallback({ tenantId, paymentId, status, deviceResponse }) {
  const callbackUrl = process.env.FIREBASE_CALLBACK_URL;
  
  if (!callbackUrl) {
    console.error('❌ FIREBASE_CALLBACK_URL is not set in the .env file.');
    return;
  }

  console.log(`📡 Sending payment result to Firebase for paymentId ${paymentId}`);

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real app, you might add a shared secret/API key here for security
      },
      body: JSON.stringify({
        tenantId,
        paymentId,
        status,
        deviceResponse,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Callback to ERP failed with status ${response.status}: ${errorBody}`);
    }

    console.log(`✅ Successfully sent callback for paymentId: ${paymentId}`);
    return await response.json();

  } catch (error) {
    console.error('❌ Error sending callback to Firebase function:', error.message);
    // In a real app, you would add retry logic here with exponential backoff.
    throw error;
  }
}

module.exports = { sendCallback };
