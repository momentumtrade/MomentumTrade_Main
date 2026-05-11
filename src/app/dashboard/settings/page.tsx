'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { getUserSettings, updateUserSettings } from '@/app/actions/user';
import { sendPerformanceReport } from '@/app/actions/reports';
import { Mail, Shield, Palette, Zap, Bell as BellIcon, Send, Clock, Globe } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { getISTTime } from '@/lib/time';
import { format } from 'date-fns';

export default function SettingsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [istTime, setIstTime] = useState<Date | null>(null);
  const [settings, setSettings] = useState({
    theme: 'system',
    reportSchedule: 'weekly',
    tradeReminders: true,
    maxDailyLoss: 5000,
    maxTradesPerDay: 5,
    customDays: [] as string[],
    customTime: '10:00'
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const userSettings = await getUserSettings(user.uid);
        if (userSettings) {
          setSettings({
            theme: userSettings.theme || 'system',
            reportSchedule: userSettings.reportFrequency || 'weekly',
            tradeReminders: userSettings.riskControlSettings?.emailAlertsEnabled ?? true,
            maxDailyLoss: userSettings.riskControlSettings?.maxDailyLossAmount ?? 5000,
            maxTradesPerDay: userSettings.riskControlSettings?.maxTradesPerDay ?? 5,
            customDays: userSettings.customReportSchedule?.days || [],
            customTime: userSettings.customReportSchedule?.time || '10:00',
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();

    // IST Clock
    getISTTime().then(setIstTime);
    const timer = setInterval(() => {
      setIstTime(prev => prev ? new Date(prev.getTime() + 1000) : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setSettings({ ...settings, [e.target.name]: value });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const result = await updateUserSettings(user.uid, {
        theme: settings.theme,
        reportFrequency: settings.reportSchedule as any,
        customReportSchedule: settings.reportSchedule === 'custom' ? {
          days: settings.customDays,
          time: settings.customTime
        } : undefined,
        riskControlSettings: { 
          maxDailyLossAmount: Number(settings.maxDailyLoss),
          maxTradesPerDay: Number(settings.maxTradesPerDay),
          emailAlertsEnabled: settings.tradeReminders 
        }
      });
      if (result.success) {
        addNotification({
          title: 'Settings Synced',
          message: 'Your platform configuration has been updated successfully.',
          type: 'success'
        });
      } else {
        addNotification({
          title: 'Sync Failed',
          message: 'Could not update settings. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      addNotification({
        title: 'Error',
        message: 'An unexpected error occurred while saving.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    if (!user || !user.email) return;
    setSendingReport(true);
    try {
      const result = await sendPerformanceReport(user.uid, user.email);
      if (result.success) {
        alert('Report sent successfully! Check your inbox.');
      } else {
        alert(`Error: ${result.error || 'Failed to send report'}`);
      }
    } catch (error) {
      console.error("Error sending test report:", error);
      alert('Failed to send report.');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
            Platform Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Configure your trading environment and performance triggers.</p>
        </div>
        
        {/* Real-time IST Clock */}
        <div className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Online IST Time</p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 tabular-nums">
              {istTime ? format(istTime, 'HH:mm:ss') : 'Connecting...'}
            </p>
          </div>
          <div className="ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Visual Preferences */}
          <Card className="border-none glass-card rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Palette className="w-5 h-5 text-emerald-500" />
                </div>
                Appearance & Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings({ ...settings, theme: t })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.theme === t ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-transparent bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <div className={`w-8 h-8 rounded-full ${t === 'light' ? 'bg-white shadow-md' : t === 'dark' ? 'bg-zinc-950 shadow-md' : 'bg-gradient-to-br from-white to-zinc-950 shadow-md'}`} />
                    <span className="text-xs font-bold capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Automated Reports */}
          <Card className="border-none glass-card rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                Performance Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Weekly Performance Mailer</p>
                  <p className="text-xs text-zinc-500">Automatically sends a detailed report every Sunday at 10:00 AM IST.</p>
                </div>
                <button
                  onClick={handleSendTestReport}
                  disabled={sendingReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {sendingReport ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
                  Send Now
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Schedule Frequency</label>
                  <select 
                    name="reportSchedule" 
                    value={settings.reportSchedule} 
                    onChange={handleChange} 
                    className="w-full glass-input"
                  >
                    <option value="daily">Daily Recap</option>
                    <option value="weekly">Weekly Deep Dive</option>
                    <option value="monthly">Monthly Overview</option>
                    <option value="custom">Custom Schedule</option>
                    <option value="never">Disabled</option>
                  </select>
                </div>

                {settings.reportSchedule === 'custom' && (
                  <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl animate-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Days</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              const newDays = settings.customDays.includes(day)
                                ? settings.customDays.filter(d => d !== day)
                                : [...settings.customDays, day];
                              setSettings({...settings, customDays: newDays});
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${settings.customDays.includes(day) ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-400'}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Dispatch Time (IST)</label>
                      <input 
                        type="time" 
                        value={settings.customTime}
                        onChange={e => setSettings({...settings, customTime: e.target.value})}
                        className="w-full glass-input py-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Risk Management */}
          <Card className="border-none glass-card rounded-[32px] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <Shield className="w-5 h-5 text-rose-500" />
                </div>
                Risk Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Max Daily Loss (₹)</label>
                <div className="relative">
                  <input 
                    name="maxDailyLoss" 
                    value={settings.maxDailyLoss} 
                    onChange={handleChange} 
                    type="number" 
                    className="w-full glass-input pr-10" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Max Trades Per Day</label>
                <input 
                  name="maxTradesPerDay" 
                  value={settings.maxTradesPerDay} 
                  onChange={handleChange} 
                  type="number" 
                  className="w-full glass-input" 
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <BellIcon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-bold">Discipline Alerts</span>
                </div>
                <input 
                  name="tradeReminders" 
                  checked={settings.tradeReminders} 
                  onChange={handleChange} 
                  type="checkbox" 
                  className="w-5 h-5 rounded-lg border-zinc-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                />
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-[32px] bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/20">
             <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 fill-white" />
                <h3 className="font-black">Save Changes</h3>
             </div>
             <p className="text-xs font-bold opacity-80 mb-6">Update your preferences to sync with your trading journal and analytics.</p>
             <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
             >
               {saving ? 'Saving...' : 'Sync Preferences'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
