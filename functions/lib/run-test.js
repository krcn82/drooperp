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
/**
 * This is a test script to manually trigger backend functions.
 * To run this, you can use a tool like ts-node:
 * `ts-node -r tsconfig-paths/register src/run-test.ts`
 * Make sure you have GOOGLE_APPLICATION_CREDENTIALS set up.
 */
const admin = __importStar(require("firebase-admin"));
const closeDay_1 = require("./pos/closeDay");
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    // Make sure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set
    admin.initializeApp();
}
async function runTest() {
    console.log('Starting manual test...');
    try {
        // Manually trigger the closeDay function for the "demoTenant"
        await (0, closeDay_1.closeDay)("demoTenant");
        console.log('Successfully triggered closeDay for demoTenant.');
    }
    catch (error) {
        console.error('Error during manual test:', error);
    }
}
runTest().then(() => {
    console.log('Test script finished.');
    process.exit(0);
}).catch(() => {
    process.exit(1);
});
//# sourceMappingURL=run-test.js.map