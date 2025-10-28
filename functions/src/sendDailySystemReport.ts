import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendEmailNotification } from "./email-notifications";

admin.initializeApp();
const db = admin.firestore();

interface LogEntry {
  functionName?: string;
  status?: "success" | "error";
  details?: string;
  timestamp?: FirebaseFirestore.Timestamp;
}

interface ErrorDetails {
  fn: string;
  details: string;
  time: string;
}

export const sendDailySystemReport = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Europe/Istanbul" },
  async (event) => {
    try {
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const logsSnap = await db
        .collection("functions_monitor")
        .where("timestamp", ">", since)
        .get();

      if (logsSnap.empty) {
        await sendEmailNotification(
          "Daily System Report",
          "No activity detected in the past 24 hours."
        );
        console.log("ℹ️ No recent logs found, sent empty report.");
        return;
      }

      const summary: Record<string, { success: number; error: number }> = {};
      let lastError: ErrorDetails | null = null;

      logsSnap.forEach((doc) => {
        const d = doc.data() as LogEntry;
        const name = d.functionName || "unknown";
        const status = d.status || "unknown";

        if (!summary[name]) summary[name] = { success: 0, error: 0 };
        if (status === "success") summary[name].success++;
        else if (status === "error") {
          summary[name].error++;
          if (!lastError || d.timestamp?.toDate() > new Date(lastError.time)) {
            lastError = {
              fn: name,
              details: d.details || "No details",
              time: d.timestamp?.toDate().toLocaleString("tr-TR") || "",
            };
          }
        }
      });

      let report = "✅ All systems operational.\n\nFunction summary (last 24h):\n";
      Object.keys(summary).forEach((fn) => {
        const s = summary[fn];
        report += `• ${fn} — ${s.success} success, ${s.error} errors\n`;
      });

      if (lastError) {
        report += `\n⚠️ Last error:\n• ${lastError.fn} → ${lastError.details} (${lastError.time})`;
      }

      await sendEmailNotification(
        `Daily System Report — ${new Date().toLocaleDateString("tr-TR")}`,
        report
      );

      console.log("✅ Daily system report email sent successfully.");
    } catch (error) {
      console.error("❌ Failed to send daily report:", error);
      await sendEmailNotification(
        "Daily System Report — ERROR",
        `An error occurred while generating the daily report:\n${error}`
      );
    }
  }
);
