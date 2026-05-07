'use server';

import { getDb } from '@/lib/mongodb';
import { Trade, PsychologyLog } from '@/types';
import { ObjectId } from 'mongodb';

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

    if (targetId && ObjectId.isValid(targetId)) {
      // Update existing
      await db.collection('trades').updateOne(
        { _id: new ObjectId(targetId) },
        { $set: { ...data, updatedAt: new Date().toISOString() } }
      );
      return { success: true };
    } else {
      // Create new
      const result = await db.collection('trades').insertOne({
        ...data,
        createdAt: new Date().toISOString()
      });
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
