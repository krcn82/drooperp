"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailySystemReport = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const email_notifications_1 = require("./email-notifications");
const db = admin.firestore();
exports.sendDailySystemReport = (0, scheduler_1.onSchedule)({ schedule: "0 7 * * *", timeZone: "Europe/Istanbul" }, async (event) => {
    try {
        const since = new Date();
        since.setHours(since.getHours() - 24);
        const logsSnap = await db
            .collection("functions_monitor")
            .where("timestamp", ">", since)
            .get();
        if (logsSnap.empty) {
            await (0, email_notifications_1.sendEmailNotification)("Daily System Report", "No activity detected in the past 24 hours.");
            console.log("ℹ️ No recent logs found, sent empty report.");
            return;
        }
        const summary = {};
        let lastError = null;
        logsSnap.forEach((doc) => {
            const d = doc.data();
            const name = d.functionName || "unknown";
            const status = d.status || "unknown";
            if (!summary[name])
                summary[name] = { success: 0, error: 0 };
            if (status === "success") {
                summary[name].success++;
            }
            else if (status === "error") {
                summary[name].error++;
                const ts = d.timestamp ? d.timestamp.toDate() : new Date(0);
                if (!lastError || ts > new Date(lastError.time)) {
                    lastError = {
                        fn: name,
                        details: d.details || "No details",
                        time: ts.toLocaleString("tr-TR"),
                    };
                }
            }
        });
        let report = "✅ All systems operational.\n\nFunction summary (last 24h):\n";
        for (const fn of Object.keys(summary)) {
            const s = summary[fn];
            report += `• ${fn} — ${s.success} success, ${s.error} errors\n`;
        }
        // 💡 Tip dönüşümüyle TypeScript'in 'never' hatasını önlüyoruz
        const err = lastError;
        if (err) {
            report += `\n⚠️ Last error:\n• ${err.fn} → ${err.details} (${err.time})`;
        }
        await (0, email_notifications_1.sendEmailNotification)(`Daily System Report — ${new Date().toLocaleDateString("tr-TR")}`, report);
        console.log("✅ Daily system report email sent successfully.");
    }
    catch (error) {
        console.error("❌ Failed to send daily report:", error);
        await (0, email_notifications_1.sendEmailNotification)("Daily System Report — ERROR", `An error occurred while generating the daily report:\n${error}`);
    }
});
//# sourceMappingURL=sendDailySystemReport.js.map