import * as admin from "firebase-admin";
import { recordTransaction } from "../recordTransaction";
import { startDevicePayment } from "../paymentDevice";
import { paymentDeviceCallback } from "../paymentDevice";
import { processStripePayment } from "../stripe";

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  recordTransaction,
  startDevicePayment,
  paymentDeviceCallback,
  processStripePayment,
};
