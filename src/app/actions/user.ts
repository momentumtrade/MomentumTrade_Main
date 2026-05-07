'use server';

import { getDb } from '@/lib/mongodb';

export async function getUserSettings(userId: string) {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ uid: userId });
    
    if (user) {
      return JSON.parse(JSON.stringify(user.settings));
    }
    
    // Default settings
    const defaultSettings = {
      theme: 'system',
      reportSchedule: 'weekly',
      emailSettings: {
        tradeReminders: true,
      },
      riskSettings: {
        maxDailyLoss: 5,
      }
    };
    
    await db.collection('users').updateOne(
      { uid: userId },
      { $set: { settings: defaultSettings } },
      { upsert: true }
    );
    
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
}

export async function updateUserSettings(userId: string, settings: any) {
  try {
    const db = await getDb();
    await db.collection('users').updateOne(
      { uid: userId },
      { $set: { settings } },
      { upsert: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false };
  }
}

export async function ensureUser(userData: { uid: string, email: string | null, displayName: string | null, photoURL: string | null }) {
  try {
    const db = await getDb();
    const existingUser = await db.collection('users').findOne({ uid: userData.uid });
    
    if (!existingUser) {
      const defaultSettings = {
        theme: 'system',
        reportSchedule: 'weekly',
        emailSettings: {
          tradeReminders: true,
          disciplineWarnings: true,
          reportSentConfirmation: true,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        riskSettings: {
          maxDailyLoss: 5,
          maxTradesPerDay: 5,
        }
      };
      
      await db.collection('users').insertOne({
        ...userData,
        createdAt: new Date().toISOString(),
        settings: defaultSettings
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error ensuring user:', error);
    return { success: false };
  }
}
