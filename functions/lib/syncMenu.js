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
exports.syncMenuWithPlatform = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * A callable function to sync a tenant's product menu with an external platform.
 * This is a placeholder for a future enhancement.
 */
exports.syncMenuWithPlatform = (0, https_1.onCall)(async (request) => {
    const { tenantId, platform } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !platform) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId or platform.');
    }
    const firestore = admin.firestore();
    try {
        // 1. Fetch current product list from Firestore
        const productsSnapshot = await firestore.collection(`tenants/${tenantId}/products`).get();
        if (productsSnapshot.empty) {
            console.log(`No products found for tenant ${tenantId}. Skipping menu sync.`);
            return { success: true, message: 'No products to sync.' };
        }
        const products = productsSnapshot.docs.map(doc => doc.data());
        // 2. --- STUB: Push to platform menu API ---
        // In a real implementation, you would format the `products` array into the
        // structure required by the platform's menu API and make a POST/PUT request.
        console.log(`[STUB] Syncing ${products.length} products for tenant ${tenantId} to platform ${platform}.`);
        // Example of what a real API call might look like:
        //
        // const fetch = require('node-fetch');
        // const integrationDoc = await firestore.doc(`tenants/${tenantId}/integrations/${platform}`).get();
        // const apiKey = integrationDoc.data()?.apiKey;
        //
        // if (!apiKey) {
        //   throw new Error(`API key for ${platform} not found.`);
        // }
        //
        // const response = await fetch(`https://api.${platform}.com/v1/menu`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${apiKey}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({ items: products })
        // });
        //
        // if (!response.ok) {
        //   const errorBody = await response.text();
        //   throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
        // }
        // 3. Update the menuSync timestamp on the integration document
        const integrationRef = firestore.doc(`tenants/${tenantId}/integrations/${platform}`);
        await integrationRef.update({
            lastMenuSync: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: `Menu sync with ${platform} completed successfully.` };
    }
    catch (error) {
        console.error(`Error syncing menu for tenant ${tenantId} with ${platform}:`, error);
        throw new https_1.HttpsError('internal', 'An unexpected error occurred during menu sync.', error.message);
    }
});
//# sourceMappingURL=syncMenu.js.map