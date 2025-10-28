import * as admin from "firebase-admin";
import { onSchedule, ScheduleOptions } from "firebase-functions/v2/scheduler";
import { closeDay } from "./closeDay";

// 🕒 Täglicher Zeitplan: Jeden Tag um 23:00 Uhr (Wiener Zeit)
const scheduleOptions: ScheduleOptions = {
  schedule: "0 23 * * *",
  timeZone: "Europe/Vienna",
};

export const generateZReport = onSchedule(scheduleOptions, async (event) => {
  const tenantsSnap = await admin.firestore().collection("tenants").get();
  for (const tenant of tenantsSnap.docs) {
    await closeDay(tenant.id);
  }
});
