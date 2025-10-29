import * as admin from "firebase-admin";
import { recordTransaction } from "../recordTransaction";
import { startDevicePayment } from "../paymentDevice";
import { paymentDeviceCallback } from "../paymentDevice";
import { generateZReport } from "./generateZReport";
import { processStripePayment } from "../stripe";

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  recordTransaction,
  startDevicePayment,
  paymentDeviceCallback,
  generateZReport,
  processStripePayment,
};
