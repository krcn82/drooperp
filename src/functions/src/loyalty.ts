
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';

/**
 * Calculates and updates a customer's loyalty points and visit history after a purchase.
 * Formula: 1 point for every €10 spent.
 */
export const updateLoyaltyPoints = onCall(async (request) => {
    const { tenantId, customerId, orderId, totalAmount } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !customerId || !orderId || totalAmount === undefined) {
        throw new HttpsError('invalid-argument', 'Missing required data: tenantId, customerId, orderId, or totalAmount.');
    }

    const db = admin.firestore();
    const customerRef = db.doc(`tenants/${tenantId}/customers/${customerId}`);

    try {
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            throw new HttpsError('not-found', `Customer with ID ${customerId} not found in tenant ${tenantId}.`);
        }

        const pointsEarned = Math.floor(totalAmount / 10);
        
        const visitData = {
            orderId,
            total: totalAmount,
            pointsEarned,
            date: admin.firestore.FieldValue.serverTimestamp(),
        };

        const updateData: { [key: string]: any } = {
            lastVisit: admin.firestore.FieldValue.serverTimestamp(),
            visits: admin.firestore.FieldValue.arrayUnion(visitData),
        };

        if (pointsEarned > 0) {
            updateData.loyaltyPoints = admin.firestore.FieldValue.increment(pointsEarned);
        }

        await customerRef.update(updateData);
        
        return { success: true, pointsEarned: pointsEarned };

    } catch (error: any) {
        console.error('Error updating loyalty points:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while updating loyalty points.');
    }
});


/**
 * Fetches loyalty information for a specific customer.
 */
export const getCustomerLoyalty = onCall(async (request) => {
    const { tenantId, customerId } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !customerId) {
        throw new HttpsError('invalid-argument', 'Missing required data: tenantId or customerId.');
    }

    const db = admin.firestore();
    const customerRef = db.doc(`tenants/${tenantId}/customers/${customerId}`);

    try {
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            throw new HttpsError('not-found', `Customer with ID ${customerId} not found.`);
        }
        const customerData = customerDoc.data()!;

        // Return only the necessary, non-sensitive loyalty info
        return {
            fullName: customerData.fullName,
            loyaltyPoints: customerData.loyaltyPoints || 0,
            vipTier: customerData.vipTier || 'none',
            lastVisit: customerData.lastVisit || null,
        };

    } catch (error: any) {
        console.error('Error fetching customer loyalty:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while fetching customer data.');
    }
});
