'use server';

import nodemailer from 'nodemailer';
import { getTrades } from './trades';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

export async function sendPerformanceReport(userId: string, userEmail: string) {
  try {
    const trades = await getTrades(userId);
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const weekTrades = trades.filter(t => {
      const date = parseISO(t.tradeDate);
      return date >= weekStart && date <= weekEnd;
    });

    const totalPnl = weekTrades.reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const wins = weekTrades.filter(t => (t.profitLossAmount || 0) > 0).length;
    const winRate = weekTrades.length > 0 ? (wins / weekTrades.length) * 100 : 0;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"MomentumTrade Reports" <${process.env.SMTP_EMAIL}>`,
      to: userEmail,
      subject: `Weekly Performance Report - ${format(now, 'MMM d, yyyy')}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10b981;">MomentumTrade Performance Summary</h2>
          <p>Hello Trader, here is your performance report for the week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}.</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
            <div style="padding: 15px; background: #f0fdf4; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #15803d; font-weight: bold;">TOTAL PNL</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">₹${totalPnl.toLocaleString('en-IN')}</p>
            </div>
            <div style="padding: 15px; background: #f0f9ff; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #0369a1; font-weight: bold;">WIN RATE</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #0ea5e9;">${Math.round(winRate)}%</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background: #f8fafc;">
              <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0;">Date</th>
              <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0;">Asset</th>
              <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0;">PNL</th>
            </tr>
            ${weekTrades.map(t => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${format(parseISO(t.tradeDate), 'MMM d')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${t.asset}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; color: ${(t.profitLossAmount || 0) >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">₹${(t.profitLossAmount || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </table>

          <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
            This is an automated report from your MomentumTrade Dashboard.
          </p>
        </div>
      `,
    };

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
       return { success: false, error: 'SMTP credentials not configured in .env.local' };
    }

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending performance report:', error);
    return { success: false, error: error.message || 'Failed to send report' };
  }
}
