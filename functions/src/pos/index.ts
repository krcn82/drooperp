import * as admin from "firebase-admin";
import { recordTransaction } from "./recordTransaction";
import { startDevicePayment } from "./startDevicePayment";
import { paymentDeviceCallback } from "./paymentDeviceCallback";
import { generateZReport } from "./generateZReport";
import { processStripePayment } from "./stripe";
import { createFinanzOnlineExport } from "./createFinanzOnlineExport";
import { submitDEPToFinanzOnline } from "./submitFinanzOnline";

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  recordTransaction,
  startDevicePayment,
  paymentDeviceCallback,
  generateZReport,
  processStripePayment,
  createFinanzOnlineExport,
  submitDEPToFinanzOnline
};
