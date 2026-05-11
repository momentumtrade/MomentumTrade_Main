'use server';

import { getDb } from '@/lib/mongodb';
import { Trade, PsychologyLog } from '@/types';
import { ObjectId } from 'mongodb';
import { getISTTime, isMarketClosed } from '@/lib/time';
import { format, parseISO } from 'date-fns';
import { sendEmail } from '@/lib/email';

export async function getTrades(userId: string) {
  try {
    const db = await getDb();
    const trades = await db.collection('trades')
      .find({ userId })
      .sort({ tradeDate: -1 })
      .toArray();

    return trades.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: t._id.toString()
    })) as unknown as Trade[];
  } catch (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
}

export async function saveTrade(tradeData: Partial<Trade>) {
  try {
    const db = await getDb();
    const { id, _id, ...data } = tradeData as any;
    const targetId = id || _id;

    // Fetch online IST time
    const istNow = await getISTTime();
    const todayStr = format(istNow, 'yyyy-MM-dd');
    
    // Determine trade date string for comparison
    let tradeDateObj;
    try {
      tradeDateObj = data.tradeDate ? new Date(data.tradeDate) : new Date();
    } catch (e) {
      tradeDateObj = new Date();
    }
    const tradeDateStr = format(tradeDateObj, 'yyyy-MM-dd');

    if (targetId && ObjectId.isValid(targetId)) {
      // Check if existing trade is locked
      const existingTrade = await db.collection('trades').findOne({ _id: new ObjectId(targetId) });
      if (existingTrade?.isLocked) {
        return { success: false, error: 'This log is locked and cannot be modified.' };
      }

      // Restriction for today's log
      if (tradeDateStr === todayStr && !isMarketClosed(istNow)) {
        return { success: false, error: 'Same-day logs can only be edited/saved after 3:30 PM IST.' };
      }

      // Update existing
      await db.collection('trades').updateOne(
        { _id: new ObjectId(targetId) },
        { $set: { ...data, isLocked: true, updatedAt: new Date().toISOString() } }
      );
      return { success: true };
    } else {
      // Restriction for today's log (new entry)
      if (tradeDateStr === todayStr && !isMarketClosed(istNow)) {
        return { success: false, error: 'Today\'s log entry can only be created after 3:30 PM IST.' };
      }

      // Create new
      const result = await db.collection('trades').insertOne({
        ...data,
        isLocked: true,
        createdAt: istNow.toISOString()
      });

      // RISK CONTROL LOGIC
      const user = await db.collection('users').findOne({ uid: data.userId });
      if (user?.settings?.riskControlSettings?.emailAlertsEnabled) {
        const limits = user.settings.riskControlSettings;
        
        // Fetch today's trades
        const todayTrades = await db.collection('trades').find({
          userId: data.userId,
          tradeDate: { $regex: `^${todayStr}` },
          marketType: { $nin: ['No Trade', 'Holiday'] }
        }).toArray();

        const todayPnl = todayTrades.reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
        const tradeCount = todayTrades.length;

        let breached = [];
        if (tradeCount > limits.maxTradesPerDay) breached.push(`Max Trades (${limits.maxTradesPerDay})`);
        if (todayPnl < -limits.maxDailyLossAmount) breached.push(`Max Daily Loss (₹${limits.maxDailyLossAmount})`);

        if (breached.length > 0) {
          const alertHtml = `
            <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 12px;">
              <h2 style="color: #ef4444;">🚨 RISK ALERT BREACHED</h2>
              <p>Hello <strong>${user.displayName || 'Trader'}</strong>,</p>
              <p>You have exceeded your predefined risk limits for today (${todayStr}):</p>
              <ul>
                ${breached.map(b => `<li style="color: #ef4444; font-weight: bold;">${b}</li>`).join('')}
              </ul>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
                <p style="margin: 0;"><strong>Current Status:</strong></p>
                <p style="margin: 5px 0;">Trades Taken: ${tradeCount}</p>
                <p style="margin: 5px 0;">Total P&L: <span style="color: ${todayPnl >= 0 ? '#10b981' : '#ef4444'}">₹${todayPnl.toLocaleString('en-IN')}</span></p>
              </div>
              <p style="margin-top: 20px; font-style: italic; color: #64748b;">"Trade to live, don't live to trade. Discipline is the only way to survive."</p>
            </div>
          `;
          await sendEmail(user.email, `🚨 Risk Alert: Limits Breached (${todayStr})`, alertHtml);
        }
      }

      return { success: true, id: result.insertedId.toString() };
    }
  } catch (error: any) {
    console.error('Error saving trade:', error);
    return { success: false, error: error.message || 'Failed to save trade' };
  }
}

export async function deleteTrade(tradeId: string) {
  try {
    const db = await getDb();
    await db.collection('trades').deleteOne({ _id: new ObjectId(tradeId) });
    return { success: true };
  } catch (error) {
    console.error('Error deleting trade:', error);
    return { success: false };
  }
}

export async function getPsychologyLogs(userId: string) {
  try {
    const db = await getDb();
    const logs = await db.collection('psychology_logs')
      .find({ userId })
      .sort({ date: -1 })
      .toArray();

    return logs.map(l => ({
      ...l,
      id: l._id.toString()
    })) as unknown as PsychologyLog[];
  } catch (error) {
    console.error('Error fetching psychology logs:', error);
    return [];
  }
}

export async function savePsychologyLog(logData: Partial<PsychologyLog>) {
  try {
    const db = await getDb();
    const { id, ...data } = logData as any;

    if (id && ObjectId.isValid(id)) {
      await db.collection('psychology_logs').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updatedAt: new Date().toISOString() } }
      );
      return { success: true };
    } else {
      const result = await db.collection('psychology_logs').insertOne({
        ...data,
        createdAt: new Date().toISOString()
      });
      return { success: true, id: result.insertedId.toString() };
    }
  } catch (error: any) {
    console.error('Error saving psychology log:', error);
    return { success: false, error: error.message || 'Failed to save log' };
  }
}
