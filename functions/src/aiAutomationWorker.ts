
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logFunctionExecution } from './functions-monitor';

/**
 * A scheduled function that runs every 15 minutes to analyze tenant data and sends insights.
 */
export const aiAutomationWorker = onSchedule({
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Berlin',
}, async (context) => {
    const start = Date.now();
    console.log('Starting AI Automation Worker...');
    
    try {
        const firestore = admin.firestore();
        const tenantsSnapshot = await firestore.collection('tenants').get();
        
        if (tenantsSnapshot.empty) {
            console.log('No tenants found. Exiting worker.');
            await logFunctionExecution('aiAutomationWorker', 'success', 'Completed: No tenants found.', Date.now() - start);
            return;
        }
        
        const analysisPromises = tenantsSnapshot.docs.map(tenantDoc => 
            analyzeTenantData(firestore, tenantDoc.id)
        );
        
        await Promise.all(analysisPromises);
        
        console.log('Successfully completed AI Automation Worker for all tenants.');
        await logFunctionExecution('aiAutomationWorker', 'success', 'Completed successfully for all tenants.', Date.now() - start);

    } catch (error: any) {
        console.error('Error running AI Automation Worker:', error);
        await logFunctionExecution('aiAutomationWorker', 'error', error.message, Date.now() - start);
    }
});

/**
 * Analyzes data for a single tenant and generates notifications.
 * @param firestore The Firestore admin instance.
 * @param tenantId The ID of the tenant to analyze.
 */
async function analyzeTenantData(firestore: admin.firestore.Firestore, tenantId: string) {
  console.log(`Analyzing data for tenant: ${tenantId}`);
  
  try {
    // 1. Analyze Sales Trends
    const salesInsight = await analyzeSales(firestore, tenantId);

    if (salesInsight) {
      // 2. Send Smart Notification
      await firestore.collection(`tenants/${tenantId}/notifications`).add({
        title: 'Daily Sales Insight',
        type: 'insight',
        message: salesInsight,
        timestamp: Timestamp.now(),
        read: false,
      });

      // 3. Post to AI Chat
      // We'll post to a specific, system-level chat session.
      const chatRef = firestore.collection(`tenants/${tenantId}/aiChats/chat_system_summary/messages`);
      await chatRef.add({
          role: 'model',
          text: `Good morning! Here's your daily business insight:\n\n${salesInsight}`,
          timestamp: Timestamp.now(),
      });
    }

    // 4. (Future) Stub for low stock warnings
    // const stockWarning = await analyzeInventory(firestore, tenantId);
    // if (stockWarning) { ... }
    
    // 5. (Future) Stub for Wolt/Foodora integration checks
    // const integrationStatus = await checkIntegrations(tenantId);
    // if (integrationStatus) { ... }

    console.log(`Successfully generated insights for tenant: ${tenantId}`);

  } catch (error) {
    console.error(`Failed to analyze data for tenant ${tenantId}:`, error);
    // Re-throw the error to be caught by the main function's catch block
    throw error;
  }
}

/**
 * Analyzes sales for the past two weeks to find a trend.
 * @param firestore The Firestore admin instance.
 * @param tenantId The ID of the tenant.
 * @returns A string with the sales insight, or null if not enough data.
 */
async function analyzeSales(firestore: admin.firestore.Firestore, tenantId: string): Promise<string | null> {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const transactionsRef = firestore.collection(`tenants/${tenantId}/transactions`);
    const snapshot = await transactionsRef.where('timestamp', '>=', twoWeeksAgo).get();

    if (snapshot.empty) {
        return null; // Not enough data
    }
    
    let lastWeekRevenue = 0;
    let previousWeekRevenue = 0;

    snapshot.forEach(doc => {
        const tx = doc.data();
        const txTimestamp = (tx.timestamp as Timestamp).toDate();
        
        if (txTimestamp >= oneWeekAgo) {
            lastWeekRevenue += tx.amountTotal || 0;
        } else {
            previousWeekRevenue += tx.amountTotal || 0;
        }
    });

    if (previousWeekRevenue === 0 && lastWeekRevenue > 0) {
        return `You've started making sales this week, with a total of €${lastWeekRevenue.toFixed(2)}! Keep it up!`;
    }
    
    if (previousWeekRevenue === 0 || lastWeekRevenue === 0) {
        return "There isn't enough consistent sales data from the last two weeks to generate a trend insight.";
    }

    const percentageChange = ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;

    if (Math.abs(percentageChange) < 5) {
        return `Sales have been stable this week, with a total of €${lastWeekRevenue.toFixed(2)}.`;
    }
    
    if (percentageChange > 0) {
        return `Great work! Sales are up ${percentageChange.toFixed(0)}% this week compared to last week, with a total of €${lastWeekRevenue.toFixed(2)}.`;
    } else {
        return `Heads up: Sales have dropped ${Math.abs(percentageChange).toFixed(0)}% this week compared to last week, with a total of €${lastWeekRevenue.toFixed(2)}.`;
    }
}
