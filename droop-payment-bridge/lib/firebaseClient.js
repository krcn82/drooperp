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
 * @param {string} callbackData.callbackUrl - The specific URL to send the callback to.
 */
async function sendCallback({ tenantId, paymentId, status, deviceResponse, callbackUrl }) {
  console.log(`Sending callback to: ${callbackUrl} for paymentId: ${paymentId}`);

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
      throw new Error(`Callback failed with status ${response.status}: ${errorBody}`);
    }

    console.log(`Successfully sent callback for paymentId: ${paymentId}`);
    return await response.json();

  } catch (error) {
    console.error('Error sending callback to Firebase function:', error.message);
    // In a real app, you would add retry logic here with exponential backoff.
    throw error;
  }
}

module.exports = { sendCallback };
