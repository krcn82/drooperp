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
exports.processStripePayment = exports.generateZReport = exports.paymentDeviceCallback = exports.startDevicePayment = exports.recordTransaction = void 0;
const admin = __importStar(require("firebase-admin"));
const recordTransaction_1 = require("../recordTransaction");
Object.defineProperty(exports, "recordTransaction", { enumerable: true, get: function () { return recordTransaction_1.recordTransaction; } });
const paymentDevice_1 = require("../paymentDevice");
Object.defineProperty(exports, "startDevicePayment", { enumerable: true, get: function () { return paymentDevice_1.startDevicePayment; } });
const paymentDevice_2 = require("../paymentDevice");
Object.defineProperty(exports, "paymentDeviceCallback", { enumerable: true, get: function () { return paymentDevice_2.paymentDeviceCallback; } });
const generateZReport_1 = require("./generateZReport");
Object.defineProperty(exports, "generateZReport", { enumerable: true, get: function () { return generateZReport_1.generateZReport; } });
const stripe_1 = require("../stripe");
Object.defineProperty(exports, "processStripePayment", { enumerable: true, get: function () { return stripe_1.processStripePayment; } });
if (!admin.apps.length) {
    admin.initializeApp();
}
//# sourceMappingURL=index.js.map