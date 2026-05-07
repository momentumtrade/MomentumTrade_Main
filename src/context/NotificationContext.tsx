'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getTrades } from '@/app/actions/trades';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Mock initial notifications or fetch from DB if needed
    if (user) {
      const initial: Notification[] = [
        {
          id: '1',
          title: 'Welcome back!',
          message: 'Ready for another profitable session?',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      setNotifications(initial);
    }
  }, [user]);

  // Performance monitoring for notifications
  useEffect(() => {
    if (!user) return;

    async function checkPerformance() {
      const trades = await getTrades(user!.uid);
      if (trades.length === 0) return;

      const recentTrades = trades.slice(0, 3);
      const wins = recentTrades.filter(t => (t.profitLossAmount || 0) > 0).length;

      if (wins === 3) {
        addNotification({
          title: 'Hot Streak!',
          message: 'You have won your last 3 trades. Maintain discipline!',
          type: 'success'
        });
      }
    }

    const interval = setInterval(checkPerformance, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const addNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep last 20
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, addNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
