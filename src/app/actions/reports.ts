'use server';

import { getDb } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { getISTTime } from '@/lib/time';
import { format } from 'date-fns';

export async function sendPerformanceReport(userId: string, email: string) {
  try {
    const db = await getDb();
    const trades = await db.collection('trades')
      .find({ userId })
      .sort({ tradeDate: -1 })
      .toArray();

    const istNow = await getISTTime();
    const dateStr = format(istNow, 'PPP p');

    // Basic stats calculation
    const actualTrades = trades.filter(t => t.marketType !== 'No Trade' && t.marketType !== 'Holiday');
    const totalPnl = trades.reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const winRate = actualTrades.length > 0 
      ? (actualTrades.filter(t => (t.profitLossAmount || 0) > 0).length / actualTrades.length) * 100 
      : 0;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981;">MomentumTrade - Performance Report</h2>
        <p style="color: #64748b;">Generated on: ${dateStr} (IST)</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
          <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Total P&L</p>
            <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">₹${totalPnl.toLocaleString('en-IN')}</p>
          </div>
          <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Win Rate</p>
            <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #3b82f6;">${winRate.toFixed(1)}%</p>
          </div>
        </div>

        <h3 style="margin-top: 30px; color: #1e293b;">Recent Activities</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #f1f5f9;">
            <th style="padding: 10px; text-align: left; font-size: 12px;">Date</th>
            <th style="padding: 10px; text-align: left; font-size: 12px;">Asset</th>
            <th style="padding: 10px; text-align: right; font-size: 12px;">P&L</th>
          </tr>
          ${actualTrades.slice(0, 5).map(t => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-size: 14px;">${format(new Date(t.tradeDate), 'MMM d')}</td>
              <td style="padding: 10px; font-size: 14px;">${t.asset}</td>
              <td style="padding: 10px; font-size: 14px; text-align: right; color: ${(t.profitLossAmount || 0) >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                ₹${(t.profitLossAmount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top: 30px; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #10b981; text-decoration: none; font-weight: bold;">View Full Journal</a>
        </div>
      </div>
    `;

    await sendEmail(email, `Performance Report - ${format(istNow, 'MMM d, yyyy')}`, html);
    return { success: true };
  } catch (error) {
    console.error('Error generating performance report:', error);
    return { success: false };
  }
}
