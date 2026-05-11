'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getTrades } from '@/app/actions/trades';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Info, 
  X,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { getISTTime } from '@/lib/time';

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

const ICON_MAP = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-rose-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
};

function XCircle({ className }: { className?: string }) {
  return <AlertCircle className={className} />;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 20));
    setToasts(prev => [...prev, newNotification]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newNotification.id));
    }, 5000);
  }, []);

  useEffect(() => {
    if (user) {
      addNotification({
        title: 'Platform Online',
        message: 'Real-time incident monitoring active.',
        type: 'info'
      });
    }
  }, [user, addNotification]);

  // Real-time Incident Monitoring
  useEffect(() => {
    if (!user) return;

    async function monitorIncidents() {
      try {
        const [trades, istNow] = await Promise.all([
          getTrades(user!.uid),
          getISTTime()
        ]);
        
        if (trades.length === 0) return;

        const todayStr = format(istNow, 'yyyy-MM-dd');
        const todayTrades = trades.filter(t => 
          format(parseISO(t.tradeDate || t.createdAt), 'yyyy-MM-dd') === todayStr &&
          t.marketType !== 'No Trade' && t.marketType !== 'Holiday'
        );

        // Incident: High Volume
        if (todayTrades.length >= 5) {
          addNotification({
            title: 'High Activity Alert',
            message: `You've taken ${todayTrades.length} trades today. Watch your focus!`,
            type: 'warning'
          });
        }

        // Incident: Loss Recovery
        const todayPnl = todayTrades.reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
        if (todayPnl < -2000) {
          addNotification({
            title: 'Risk Boundary Warning',
            message: `Daily loss has exceeded ₹2,000. Review your risk plan.`,
            type: 'error'
          });
        }
      } catch (err) {
        console.error('Incident monitoring failed:', err);
      }
    }

    const interval = setInterval(monitorIncidents, 300000); // Check every 5 mins
    return () => clearInterval(interval);
  }, [user, addNotification]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, addNotification, clearAll }}>
      {children}
      
      {/* Toast Portal */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className="relative group overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 rounded-[24px] shadow-2xl shadow-black/10 flex items-start gap-4">
                {/* Progress bar */}
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${
                    toast.type === 'success' ? 'bg-emerald-500' :
                    toast.type === 'error' ? 'bg-rose-500' :
                    toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                />

                <div className="flex-shrink-0 mt-0.5">
                  {ICON_MAP[toast.type]}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-0.5">
                    {toast.title}
                  </h4>
                  <p className="text-xs font-bold text-zinc-500 leading-snug">
                    {toast.message}
                  </p>
                </div>

                <button 
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

function parseISO(dateStr: string): Date {
  return new Date(dateStr);
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
