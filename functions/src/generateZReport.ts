import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from './types';

/**
 * Generates a Z-Report for a given cash register session.
 * Calculates totals and updates the cash register document.
 */
export const generateZReport = onCall(async (request: CallableRequest<AnyData>) => {
    const { tenantId, cashRegisterId } = request.data as { tenantId?: string; cashRegisterId?: string };
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !cashRegisterId) {
        throw new HttpsError('invalid-argument', 'Missing required data: tenantId or cashRegisterId.');
    }

    const firestore = admin.firestore();
    const registerRef = firestore.doc(`tenants/${tenantId}/cashRegisters/${cashRegisterId}`);

    try {
        const registerDoc = await registerRef.get();
        if (!registerDoc.exists) {
            throw new HttpsError('not-found', 'Cash register session not found.');
        }
        const registerData = registerDoc.data()!;

        // 1. Find all payments for this cash register session
        const paymentsSnapshot = await firestore.collection(`tenants/${tenantId}/payments`)
            .where('cashRegisterId', '==', cashRegisterId)
            .where('status', '==', 'completed')
            .get();

        if (paymentsSnapshot.empty) {
            // No payments, just close the register
            await registerRef.update({
                status: 'closed',
                closedAt: admin.firestore.FieldValue.serverTimestamp(),
                closingBalance: registerData.openingBalance,
                totalSales: 0,
                totalCashSales: 0,
            });
            return { success: true, message: 'Session closed. No transactions were made.' };
        }

        // 2. Calculate totals
        let totalSales = 0;
        let totalCashSales = 0;
        const paymentMethodBreakdown: { [key: string]: { count: number, total: number } } = {};

        paymentsSnapshot.forEach(doc => {
            const payment = doc.data() as any;
            totalSales += payment.amount || 0;
            if (payment.method === 'cash') {
                totalCashSales += payment.amount || 0;
            }

            if (paymentMethodBreakdown[payment.method]) {
                paymentMethodBreakdown[payment.method].count++;
                paymentMethodBreakdown[payment.method].total += payment.amount || 0;
            } else {
                paymentMethodBreakdown[payment.method] = { count: 1, total: payment.amount || 0 };
            }
        });

        const closingBalance = (registerData.openingBalance || 0) + totalCashSales;

        // 3. Update the cash register document
        await registerRef.update({
            status: 'closed',
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            closedBy: uid,
            totalSales,
            totalCashSales,
            paymentMethodBreakdown,
            closingBalance,
        });

        // 4. (STUB) Generate and store the report
        const reportData = {
            cashRegisterId,
            ...registerData,
            closedBy: uid,
            totalSales,
            totalCashSales,
            paymentMethodBreakdown,
            closingBalance,
        };
        await firestore.collection(`tenants/${tenantId}/reports`).add({
            type: 'z-report',
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            data: reportData,
            fileUrl: null,
        });
        
        return { success: true, message: 'Z-Report generated successfully.' };

    } catch (error: any) {
        console.error('Error generating Z-Report:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.', error?.message || String(error));
    }
});
