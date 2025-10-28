import * as admin from "firebase-admin";
import { recordTransaction } from "./recordTransaction";
import { startDevicePayment } from "./startDevicePayment";
import { paymentDeviceCallback } from "./paymentDeviceCallback";
import { processStripePayment } from "./stripe";
import { createFinanzOnlineExport } from "./createFinanzOnlineExport";
import { submitDEPToFinanzOnline } from "./submitFinanzOnline";
import { logFinanzOnlineTransmission } from "./logFinanzOnline";

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  recordTransaction,
  startDevicePayment,
  paymentDeviceCallback,
  processStripePayment,
  createFinanzOnlineExport,
  submitDEPToFinanzOnline,
  logFinanzOnlineTransmission,
};
