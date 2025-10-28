
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { startOfDay, subDays } from 'date-fns';

type TransactionItem = {
  name: string;
  qty: number;
  price: number;
  productId: string;
};

type Transaction = {
  id: string;
  items: TransactionItem[];
  amountTotal: number;
  timestamp: admin.firestore.Timestamp;
};

type ReportData = {
  totalRevenue: number;
  totalTransactions: number;
  avgTicketSize: number;
  chartData: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
};

export const generateReport = onCall(async (request) => {
  const { tenantId, range } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !range) {
    throw new HttpsError('invalid-argument', 'Missing required data: tenantId or range.');
  }

  const firestore = admin.firestore();
  
  // Admin Check: Verify the user has the 'admin' role for this tenant.
  const userDoc = await firestore.doc(`tenants/${tenantId}/users/${uid}`).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'You must be an admin to generate reports.');
  }

  // Determine date range
  const now = new Date();
  let startDate: Date;
  switch (range) {
    case 'today':
      startDate = startOfDay(now);
      break;
    case 'last7days':
      startDate = startOfDay(subDays(now, 7));
      break;
    case 'last30days':
    default:
      startDate = startOfDay(subDays(now, 30));
      break;
  }
  
  const transactionsSnapshot = await firestore
    .collection(`tenants/${tenantId}/transactions`)
    .where('timestamp', '>=', startDate)
    .get();

  if (transactionsSnapshot.empty) {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      avgTicketSize: 0,
      chartData: [],
      topProducts: [],
    };
  }
  
  const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));

  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amountTotal || 0), 0);
  const totalTransactions = transactions.length;
  const avgTicketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const dailyRevenue: { [key: string]: number } = {};
  transactions.forEach(tx => {
    if (tx.timestamp) {
      const dateStr = tx.timestamp.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
      dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + (tx.amountTotal || 0);
    }
  });

  const chartData = Object.keys(dailyRevenue).map(date => ({
    date: date,
    revenue: dailyRevenue[date],
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
  transactions.forEach(tx => {
    if (Array.isArray(tx.items)) {
      tx.items.forEach(item => {
        const id = item.productId || item.name;
        const quantity = item.qty || 0;
        const price = item.price || 0;

        if (!id || !quantity) return;

        const existing = productSales.get(id);
        if (existing) {
          existing.quantity += quantity;
          existing.revenue += price * quantity;
        } else {
          productSales.set(id, { name: item.name, quantity: quantity, revenue: price * quantity });
        }
      });
    }
  });

  const topProducts = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  
  const report: ReportData = {
    totalRevenue,
    totalTransactions,
    avgTicketSize,
    chartData,
    topProducts,
  };
  
  // Store report in Firestore
  const reportId = `${range}_${new Date().toISOString()}`;
  await firestore.collection(`tenants/${tenantId}/reports`).doc(reportId).set({
      ...report,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: uid,
  });
  
  // TODO: Add logic to prune old reports to keep only the last 3

  return report;
});
