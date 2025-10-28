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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateZReport = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const closeDay_1 = require("./closeDay");
// 🕒 Täglicher Zeitplan: Jeden Tag um 23:00 Uhr (Wiener Zeit)
const scheduleOptions = {
    schedule: "0 23 * * *",
    timeZone: "Europe/Vienna",
};
exports.generateZReport = (0, scheduler_1.onSchedule)(scheduleOptions, async (event) => {
    const tenantsSnap = await admin.firestore().collection("tenants").get();
    for (const tenant of tenantsSnap.docs) {
        await (0, closeDay_1.closeDay)(tenant.id);
    }
});
//# sourceMappingURL=generateZReport.js.map
