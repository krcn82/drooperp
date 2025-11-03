
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from './types';

/**
 * Calculates and updates a customer's loyalty points and visit history after a purchase.
 * Formula: 1 point for every €10 spent.
 */
export const updateLoyaltyPoints = onCall(async (request: CallableRequest<AnyData>) => {
    const { tenantId, customerId, orderId, totalAmount } = request.data as { tenantId?: string; customerId?: string; orderId?: string; totalAmount?: number };
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
        
        if (pointsEarned > 0) {
            const visitData = {
                orderId,
                total: totalAmount,
                pointsEarned,
                date: admin.firestore.FieldValue.serverTimestamp(),
            };

            await customerRef.update({
                loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
                lastVisit: admin.firestore.FieldValue.serverTimestamp(),
                visits: admin.firestore.FieldValue.arrayUnion(visitData),
            });
             return { success: true, pointsEarned: pointsEarned };
        }
        
        return { success: true, pointsEarned: 0, message: 'No points earned for this transaction.' };

    } catch (error: any) {
        console.error('Error updating loyalty points:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while updating loyalty points.');
    }
});
