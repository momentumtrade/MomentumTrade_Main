'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Activity, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ArrowRight,
  Plus,
  Save,
  X,
  BookOpen,
  Zap,
  Menu,
  Clock,
  Lock,
  MoreVertical,
  Settings2,
  Trash2,
  Check
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { getISTTime, isMarketClosed } from '@/lib/time';
import { useEffect, useState, useMemo } from 'react';
import { getTrades, saveTrade } from '@/app/actions/trades';
import { getUserSettings, updateUserSettings } from '@/app/actions/user';
import { Trade } from '@/types';
import Link from 'next/link';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isToday, 
  addMonths, 
  subMonths,
  parseISO,
  startOfWeek
} from 'date-fns';
import { useTheme } from '@teispace/next-themes';
import * as Dialog from '@radix-ui/react-dialog';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    asset: '',
    marketType: 'Forex' as 'Forex' | 'Crypto' | 'Stocks' | 'Futures' | 'Options' | 'No Trade' | 'Holiday',
    tradeDirection: 'Buy' as 'Buy' | 'Sell',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    positionSize: '',
    riskRewardRatio: '',
    profitLossAmount: '',
    profitLossPercentage: '',
    fees: '0',
    leverageUsed: '1',
    sessionTraded: 'London' as 'London' | 'New York' | 'Asian',
    strategyUsed: '',
    setupType: '',
    tradeQualityRating: '5',
    confidenceLevel: '5',
    notes: '',
    entryTime: '',
    exitTime: '',
    customFields: {} as Record<string, string>
  });
  const [isSaving, setIsSaving] = useState(false);
  const [istTime, setIstTime] = useState<Date | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [customOptions, setCustomOptions] = useState({
    markets: ['Forex', 'Crypto', 'Stocks', 'Futures', 'Options'],
    strategies: ['ICT', 'SMC', 'Breakout', 'Scalping'],
    setups: ['Day High/Low', 'Retest', 'FVG Entry'],
    sessions: ['London', 'New York', 'Asian']
  });
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [logView, setLogView] = useState<'quick' | 'detailed'>('quick');
  const [fieldDefinitions, setFieldDefinitions] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('All');
  const [selectedSetup, setSelectedSetup] = useState<string>('All');

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchDashboardData();
    }
    
    // Initial IST time fetch
    getISTTime().then(setIstTime);
    
    if (user) {
      getUserSettings(user.uid).then(settings => {
        if (settings?.customFieldDefinitions) {
          setFieldDefinitions(settings.customFieldDefinitions);
        }
        if (settings?.customDropdownOptions) {
          setCustomOptions(settings.customDropdownOptions);
        }
        if (settings?.defaultValues) {
          setDefaultValues(settings.defaultValues);
        }
      });
    }

    // Update IST time every minute
    const timer = setInterval(() => {
      setIstTime(prev => prev ? new Date(prev.getTime() + 60000) : null);
    }, 60000);
    
    return () => clearInterval(timer);
  }, [user]);

  // Auto-calculate PNL
  useEffect(() => {
    if ((formData.marketType as string) === 'No Trade' || (formData.marketType as string) === 'Holiday') return;

    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const size = parseFloat(formData.positionSize);
    
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size) && entry > 0) {
      let pnl = 0;
      if (formData.tradeDirection === 'Buy') {
        pnl = (exit - entry) * size;
      } else {
        pnl = (entry - exit) * size;
      }
      
      const pnlPercent = (pnl / (entry * size)) * 100;
      
      // Only update if different to avoid loops
      if (pnl.toFixed(2) !== formData.profitLossAmount || pnlPercent.toFixed(2) !== formData.profitLossPercentage) {
        setFormData(prev => ({
          ...prev,
          profitLossAmount: pnl.toFixed(2),
          profitLossPercentage: pnlPercent.toFixed(2)
        }));
      }
    }
  }, [formData.entryPrice, formData.exitPrice, formData.positionSize, formData.tradeDirection, formData.marketType]);

  async function fetchDashboardData() {
    if (!user) return;
    setLoadingData(true);
    try {
      const fetchedTrades = await getTrades(user.uid);
      setTrades(fetchedTrades);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  }

  const kpis = useMemo(() => {
    const groupedByDay: Record<string, number> = {};
    const groupedByWeek: Record<string, number> = {};
    const groupedByMonth: Record<string, number> = {};
    
    let currentEquity = 10000;
    let peakEquity = 10000;
    let maxDrawdown = 0;
    let totalProfit = 0;
    let winningTrades = 0;
    let totalRR = 0;

    const equityData: { date: string, value: number }[] = [{ date: 'Start', value: currentEquity }];

    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );

    const actualTrades = sortedTrades.filter(t => t.marketType !== 'No Trade' && t.marketType !== 'Holiday');

    sortedTrades.forEach(trade => {
      const tradeDateObj = parseISO(trade.tradeDate || trade.createdAt);
      const dayKey = format(tradeDateObj, 'yyyy-MM-dd');
      const weekKey = format(startOfWeek(tradeDateObj), 'yyyy-ww');
      const monthKey = format(tradeDateObj, 'yyyy-MM');
      
      const pnl = trade.profitLossAmount || 0;
      
      groupedByDay[dayKey] = (groupedByDay[dayKey] || 0) + pnl;
      groupedByWeek[weekKey] = (groupedByWeek[weekKey] || 0) + pnl;
      groupedByMonth[monthKey] = (groupedByMonth[monthKey] || 0) + pnl;

      totalProfit += pnl;
      if (pnl > 0) winningTrades++;
      if (trade.marketType !== 'No Trade' && trade.marketType !== 'Holiday') {
        totalRR += (trade.riskRewardRatio || 0);
      }
      
      currentEquity += pnl;
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      
      const drawdown = peakEquity - currentEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      equityData.push({ date: format(tradeDateObj, 'MMM d'), value: currentEquity });
    });

    const dailyPnlData = Object.entries(groupedByDay).map(([date, pnl]) => ({ date: format(parseISO(date), 'MMM d'), pnl })).slice(-7);
    const weeklyPnlData = Object.entries(groupedByWeek).map(([week, pnl]) => ({ name: `W${week.split('-')[1]}`, pnl })).slice(-4);
    const monthlyPnlData = Object.entries(groupedByMonth).map(([month, pnl]) => ({ name: format(parseISO(`${month}-01`), 'MMM'), pnl })).slice(-3);

    // Current Month Stats
    const currentMonthKey = format(currentMonth, 'yyyy-MM');
    const monthTrades = trades.filter(t => format(parseISO(t.tradeDate), 'yyyy-MM') === currentMonthKey && t.marketType !== 'No Trade' && t.marketType !== 'Holiday');
    const monthPnl = groupedByMonth[currentMonthKey] || 0;
    const monthWins = monthTrades.filter(t => (t.profitLossAmount || 0) > 0).length;
    const monthWinRate = monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0;
    
    const monthWinAmount = monthTrades.filter(t => (t.profitLossAmount || 0) > 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const monthLossAmount = Math.abs(monthTrades.filter(t => (t.profitLossAmount || 0) < 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0));
    const monthProfitFactor = monthLossAmount > 0 ? monthWinAmount / monthLossAmount : monthWinAmount > 0 ? 100 : 0;

    // Yearly Stats
    const currentYearKey = format(currentMonth, 'yyyy');
    const yearTrades = trades.filter(t => format(parseISO(t.tradeDate), 'yyyy') === currentYearKey && t.marketType !== 'No Trade' && t.marketType !== 'Holiday');
    const yearPnl = trades.filter(t => format(parseISO(t.tradeDate), 'yyyy') === currentYearKey).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const yearWins = yearTrades.filter(t => (t.profitLossAmount || 0) > 0).length;
    const yearWinRate = yearTrades.length > 0 ? (yearWins / yearTrades.length) * 100 : 0;
    
    const yearWinAmount = yearTrades.filter(t => (t.profitLossAmount || 0) > 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const yearLossAmount = Math.abs(yearTrades.filter(t => (t.profitLossAmount || 0) < 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0));
    const yearProfitFactor = yearLossAmount > 0 ? yearWinAmount / yearLossAmount : yearWinAmount > 0 ? 100 : 0;

    let winningDays = 0;
    let losingDays = 0;
    Object.values(groupedByDay).forEach(val => {
      if (val > 0) winningDays++;
      else if (val < 0) losingDays++;
    });

    const totalWinAmount = trades.filter(t => (t.profitLossAmount || 0) > 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const totalLossAmount = Math.abs(trades.filter(t => (t.profitLossAmount || 0) < 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;

    // Strategy & Setup Stats
    const strategyAnalysis: Record<string, { pnl: number, count: number, wins: number, equity: {date: string, value: number}[] }> = {};
    const setupAnalysis: Record<string, { pnl: number, count: number, wins: number, equity: {date: string, value: number}[] }> = {};

    actualTrades.forEach(trade => {
      const s = trade.strategyUsed || 'Unknown';
      const t = trade.setupType || 'Unknown';
      const pnl = trade.profitLossAmount || 0;
      const date = format(parseISO(trade.tradeDate), 'MMM d');

      if (!strategyAnalysis[s]) strategyAnalysis[s] = { pnl: 0, count: 0, wins: 0, equity: [] };
      strategyAnalysis[s].pnl += pnl;
      strategyAnalysis[s].count++;
      if (pnl > 0) strategyAnalysis[s].wins++;
      strategyAnalysis[s].equity.push({ date, value: strategyAnalysis[s].pnl });

      if (!setupAnalysis[t]) setupAnalysis[t] = { pnl: 0, count: 0, wins: 0, equity: [] };
      setupAnalysis[t].pnl += pnl;
      setupAnalysis[t].count++;
      if (pnl > 0) setupAnalysis[t].wins++;
      setupAnalysis[t].equity.push({ date, value: setupAnalysis[t].pnl });
    });

    return {
      totalProfit,
      winningTrades,
      losingTrades: actualTrades.length - winningTrades,
      winRate: actualTrades.length > 0 ? (winningTrades / actualTrades.length) * 100 : 0,
      totalRR,
      avgRR: actualTrades.length > 0 ? totalRR / actualTrades.length : 0,
      maxDrawdown,
      equityData,
      dailyPnlData,
      weeklyPnlData,
      monthlyPnlData,
      dailyPnlMap: groupedByDay,
      winningDays,
      losingDays,
      profitFactor,
      currentMonthStats: {
        pnl: monthPnl,
        winRate: monthWinRate,
        totalTrades: monthTrades.length,
        profitFactor: monthProfitFactor
      },
      currentYearStats: {
        pnl: yearPnl,
        winRate: yearWinRate,
        totalTrades: yearTrades.length,
        profitFactor: yearProfitFactor
      },
      avgPnlPerDay: winningDays + losingDays > 0 ? totalProfit / (winningDays + losingDays) : 0,
      strategyAnalysis,
      setupAnalysis
    };
  }, [trades, currentMonth]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const dateKey = format(day, 'yyyy-MM-dd');
    const existingTrade = trades.find(t => format(parseISO(t.tradeDate), 'yyyy-MM-dd') === dateKey);
    
    // Check if locked or restricted
    const isDayToday = istTime && format(day, 'yyyy-MM-dd') === format(istTime, 'yyyy-MM-dd');
    const restricted = !!(isDayToday && istTime && !isMarketClosed(istTime));
    const locked = !!existingTrade?.isLocked;
    
    setIsRestricted(restricted);
    setIsLocked(locked);

    if (existingTrade) {
      setFormData({
        asset: existingTrade.asset || '',
        marketType: (existingTrade.marketType as any) || 'Forex',
        tradeDirection: (existingTrade.tradeDirection as any) || 'Buy',
        entryPrice: existingTrade.entryPrice?.toString() || '',
        exitPrice: existingTrade.exitPrice?.toString() || '',
        stopLoss: existingTrade.stopLoss?.toString() || '',
        takeProfit: existingTrade.takeProfit?.toString() || '',
        positionSize: existingTrade.positionSize?.toString() || '',
        riskRewardRatio: existingTrade.riskRewardRatio?.toString() || '',
        profitLossAmount: existingTrade.profitLossAmount?.toString() || '',
        profitLossPercentage: existingTrade.profitLossPercentage?.toString() || '',
        fees: existingTrade.fees?.toString() || '0',
        leverageUsed: existingTrade.leverageUsed?.toString() || '1',
        sessionTraded: existingTrade.sessionTraded || 'London',
        strategyUsed: existingTrade.strategyUsed || '',
        setupType: existingTrade.setupType || '',
        tradeQualityRating: (existingTrade.tradeQualityRating || 5).toString(),
        confidenceLevel: (existingTrade.confidenceLevel || 5).toString(),
        notes: existingTrade.notes || '',
        entryTime: existingTrade.entryTime || '',
        exitTime: existingTrade.exitTime || '',
        customFields: existingTrade.customFields || {}
      });
    } else {
      setFormData({
        asset: '',
        marketType: (defaultValues.marketType as any) || 'Forex',
        tradeDirection: (defaultValues.tradeDirection as any) || 'Buy',
        entryPrice: '',
        exitPrice: '',
        stopLoss: '',
        takeProfit: '',
        positionSize: '',
        riskRewardRatio: '',
        profitLossAmount: '',
        profitLossPercentage: '',
        fees: '0',
        leverageUsed: '1',
        sessionTraded: (defaultValues.sessionTraded as any) || 'London',
        strategyUsed: defaultValues.strategyUsed || '',
        setupType: defaultValues.setupType || '',
        tradeQualityRating: '5',
        confidenceLevel: '5',
        notes: '',
        entryTime: '10:00',
        exitTime: '11:00',
        customFields: fieldDefinitions.reduce((acc, def) => ({ ...acc, [def]: '' }), {})
      });
    }
    setLogView('quick');
    setIsDialogOpen(true);
  };

  const handleUpdateOptions = async (newOptions: typeof customOptions) => {
    setCustomOptions(newOptions);
    if (user) {
      const settings = await getUserSettings(user.uid);
      await updateUserSettings(user.uid, {
        ...settings,
        customDropdownOptions: newOptions
      });
    }
  };

  const handleSetDefault = async (field: string, value: string) => {
    const newDefaults = { ...defaultValues, [field]: value };
    setDefaultValues(newDefaults);
    if (user) {
      const settings = await getUserSettings(user.uid);
      await updateUserSettings(user.uid, {
        ...settings,
        defaultValues: newDefaults
      });
    }
  };

  const handleEditOption = async (category: keyof typeof customOptions, oldVal: string) => {
    const newVal = prompt(`Rename "${oldVal}" to:`, oldVal);
    if (!newVal || newVal === oldVal) return;
    
    const newOptions = { ...customOptions };
    newOptions[category] = newOptions[category].map(v => v === oldVal ? newVal : v);
    await handleUpdateOptions(newOptions);
    
    // Update formData if currently selected
    const fieldMap: Record<string, keyof typeof formData> = {
      markets: 'marketType',
      strategies: 'strategyUsed',
      setups: 'setupType',
      sessions: 'sessionTraded'
    };
    if (formData[fieldMap[category]] === oldVal) {
      setFormData({ ...formData, [fieldMap[category]]: newVal });
    }
  };

  const handleDeleteOption = async (category: keyof typeof customOptions, val: string) => {
    if (!confirm(`Are you sure you want to delete "${val}"?`)) return;
    const newOptions = { ...customOptions };
    newOptions[category] = newOptions[category].filter(v => v !== val);
    await handleUpdateOptions(newOptions);
  };

  const handleAddPermanentField = async () => {
    const label = prompt('Enter custom field label (e.g. Psychology, Mistake):');
    if (!label || fieldDefinitions.includes(label)) return;
    
    const newDefs = [...fieldDefinitions, label];
    setFieldDefinitions(newDefs);
    setFormData(prev => ({ ...prev, customFields: { ...prev.customFields, [label]: '' } }));
    
    if (user) {
      const settings = await getUserSettings(user.uid);
      await updateUserSettings(user.uid, {
        ...settings,
        customFieldDefinitions: newDefs
      });
    }
  };

  const handleQuickStatus = async (status: 'No Trade' | 'Holiday') => {
    if (!user || !selectedDay) return;
    setIsSaving(true);
    try {
      const dateKey = format(selectedDay, 'yyyy-MM-dd');
      const existingTrade = trades.find(t => format(parseISO(t.tradeDate), 'yyyy-MM-dd') === dateKey);
      
      const tradeData: any = {
        userId: user.uid,
        tradeDate: selectedDay.toISOString(),
        marketType: status,
        asset: status,
        tradeDirection: 'N/A',
        entryPrice: 0,
        exitPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        riskRewardRatio: 0,
        profitLossAmount: 0,
        profitLossPercentage: 0,
        fees: 0,
        leverageUsed: 0,
        tradeQualityRating: 5,
        confidenceLevel: 5,
        notes: status === 'Holiday' ? 'Market Holiday' : 'No setups found',
        status: 'Closed',
        createdAt: existingTrade?.createdAt || new Date().toISOString()
      };

      if (existingTrade) {
        tradeData.id = existingTrade.id || existingTrade._id;
      }

      const result = await saveTrade(tradeData);
      if (result.success) {
        // Update local state immediately for faster UI feedback
        const updatedTrade = { ...tradeData, id: result.id || tradeData.id };
        setTrades(prev => {
          const filtered = prev.filter(t => (t.id || t._id) !== (tradeData.id));
          return [...filtered, updatedTrade];
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Quick status error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePnl = async () => {
    if (!user || !selectedDay) return;
    setIsSaving(true);
    try {
      const dateKey = format(selectedDay, 'yyyy-MM-dd');
      const existingTrade = trades.find(t => format(parseISO(t.tradeDate), 'yyyy-MM-dd') === dateKey);
      
      const tradeData: any = {
        userId: user.uid,
        ...formData,
        tradeDate: selectedDay.toISOString(),
        entryPrice: Number(formData.entryPrice) || 0,
        exitPrice: Number(formData.exitPrice) || 0,
        stopLoss: Number(formData.stopLoss) || 0,
        takeProfit: Number(formData.takeProfit) || 0,
        positionSize: Number(formData.positionSize) || 0,
        riskRewardRatio: Number(formData.riskRewardRatio) || 0,
        profitLossAmount: Number(formData.profitLossAmount) || 0,
        profitLossPercentage: Number(formData.profitLossPercentage) || 0,
        fees: Number(formData.fees) || 0,
        leverageUsed: Number(formData.leverageUsed) || 1,
        tradeQualityRating: Number(formData.tradeQualityRating),
        confidenceLevel: Number(formData.confidenceLevel),
        status: 'Closed',
        createdAt: existingTrade?.createdAt || new Date().toISOString()
      };

      if (existingTrade) {
        tradeData.id = existingTrade.id || existingTrade._id;
      }

      const result = await saveTrade(tradeData);
      if (result.success) {
        // Update local state immediately
        const updatedTrade = { ...tradeData, id: result.id || tradeData.id };
        setTrades(prev => {
          const filtered = prev.filter(t => (t.id || t._id) !== (tradeData.id));
          return [...filtered, updatedTrade];
        });
        setIsDialogOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  const chartColors = {
    grid: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 185, 129, 0.1)',
    text: theme === 'dark' ? '#71717a' : '#059669',
    tooltipBg: theme === 'dark' ? '#18181b' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#27272a' : '#10b981',
    tooltipText: theme === 'dark' ? '#ffffff' : '#064e3b',
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const blanks = Array.from({ length: monthStart.getDay() }).map((_, i) => i);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-black text-emerald-500 tracking-tight">Great Trading Journal</h1>
        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
          <Menu className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Select Month Card */}
      <Card className="border-none glass-card rounded-[32px] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Select Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              value={format(currentMonth, 'MMMM')}
              onChange={(e) => {
                const monthIdx = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(e.target.value);
                const newDate = new Date(currentMonth.getFullYear(), monthIdx, 1);
                setCurrentMonth(newDate);
              }}
              className="flex-1 glass-input rounded-2xl px-4 py-3 font-medium"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select 
              value={currentMonth.getFullYear()}
              onChange={(e) => {
                const newDate = new Date(Number(e.target.value), currentMonth.getMonth(), 1);
                setCurrentMonth(newDate);
              }}
              className="flex-1 glass-input rounded-2xl px-4 py-3 font-medium"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="flex-1 py-3 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-bold rounded-xl transition-all active:scale-95">← Previous</button>
            <button onClick={() => setCurrentMonth(new Date())} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all active:scale-95">Current Month</button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="flex-1 py-3 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-bold rounded-xl transition-all active:scale-95">Next →</button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar - Moved to Top */}
      <Card className="border-none glass-card rounded-[32px] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {[0, 1, 2, 3, 4].map(weekIdx => {
            const weekDays = days.slice(weekIdx * 7, (weekIdx + 1) * 7);
            if (weekDays.length === 0) return null;
            
            let weekTotal = 0;
            weekDays.forEach(day => {
              weekTotal += kpis.dailyPnlMap[format(day, 'yyyy-MM-dd')] || 0;
            });

            return (
              <div key={weekIdx} className="space-y-4">
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-center text-xs">Week {weekIdx + 1}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {weekDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const pnl = kpis.dailyPnlMap[dateKey];
                    const trade = trades.find(t => format(parseISO(t.tradeDate), 'yyyy-MM-dd') === dateKey);
                    const marketType = trade?.marketType;

                    let bgColor = 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400';
                    if (marketType === 'No Trade') bgColor = 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/20';
                    else if (marketType === 'Holiday') bgColor = 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 ring-1 ring-blue-500/20';
                    else if (pnl > 0) bgColor = 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20';
                    else if (pnl < 0) bgColor = 'bg-rose-50/80 dark:bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20';
                    else if (pnl === 0 && trade) bgColor = 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 ring-1 ring-zinc-500/20';

                    return (
                      <button 
                        key={dateKey} 
                        onClick={() => handleDayClick(day)}
                        className={`
                          w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm
                          ${bgColor}
                          ${isToday(day) ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-900 z-10' : ''}
                        `}
                      >
                        <span className="text-lg font-black leading-none">{format(day, 'd')}</span>
                        {marketType === 'No Trade' && <span className="text-[8px] font-bold mt-2 uppercase">No Trade</span>}
                        {marketType === 'Holiday' && <span className="text-[8px] font-bold mt-2 uppercase">Holiday</span>}
                        {pnl !== undefined && marketType !== 'No Trade' && marketType !== 'Holiday' && (
                          <span className="text-[10px] font-bold mt-2">
                            {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl) >= 1000 ? (pnl/1000).toFixed(1)+'k' : pnl.toFixed(0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${weekTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    Total: {weekTotal >= 0 ? '+' : ''}₹{weekTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Monthly Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none glass-card rounded-[32px] overflow-hidden md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <span className="text-zinc-800 dark:text-zinc-200">{format(currentMonth, 'MMMM yyyy')} Statistics</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Dynamic Period</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Initial Balance" value="₹10,000" />
              <StatCard label="Period PNL" value={`₹${kpis.currentMonthStats.pnl.toLocaleString('en-IN')}`} color={kpis.currentMonthStats.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'} prefix={kpis.currentMonthStats.pnl >= 0 ? '+' : ''} />
              <StatCard label="Win Rate" value={`${Math.round(kpis.currentMonthStats.winRate)}%`} />
              <StatCard label="Profit Factor" value={kpis.currentMonthStats.profitFactor.toFixed(2)} />
              <StatCard label="Total Trades" value={kpis.currentMonthStats.totalTrades.toString()} />
              <StatCard label="Average PNL/Day" value={`₹${Math.round(kpis.avgPnlPerDay).toLocaleString('en-IN')}`} color={kpis.avgPnlPerDay >= 0 ? 'text-emerald-500' : 'text-rose-500'} prefix={kpis.avgPnlPerDay >= 0 ? '+' : ''} />
              <StatCard label="Max Drawdown" value={`₹${kpis.maxDrawdown.toLocaleString('en-IN')}`} />
              <StatCard label="Win/Loss Ratio" value={`${Math.round(kpis.winRate)}%`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <span>{format(currentMonth, 'MMMM')} Performance</span>
              <span className={`px-4 py-1 rounded-full text-xs font-black ${kpis.currentMonthStats.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {kpis.currentMonthStats.pnl >= 0 ? '+' : ''}₹{kpis.currentMonthStats.pnl.toLocaleString('en-IN')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Month PNL</p>
                   <p className={`text-xl font-black ${kpis.currentMonthStats.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     ₹{kpis.currentMonthStats.pnl.toLocaleString('en-IN')}
                   </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Win Rate</p>
                   <p className="text-xl font-black text-cyan-500">{Math.round(kpis.currentMonthStats.winRate)}%</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trades</p>
                   <p className="text-xl font-black text-violet-500">{kpis.currentMonthStats.totalTrades}</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Profit Factor</p>
                   <p className="text-xl font-black text-amber-500">{kpis.currentMonthStats.profitFactor.toFixed(2)}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <span>{format(currentMonth, 'yyyy')} Yearly Performance</span>
              <span className={`px-4 py-1 rounded-full text-xs font-black ${kpis.currentYearStats.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {kpis.currentYearStats.pnl >= 0 ? '+' : ''}₹{kpis.currentYearStats.pnl.toLocaleString('en-IN')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Year PNL</p>
                   <p className={`text-xl font-black ${kpis.currentYearStats.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     ₹{kpis.currentYearStats.pnl.toLocaleString('en-IN')}
                   </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Win Rate</p>
                   <p className="text-xl font-black text-emerald-500">{Math.round(kpis.currentYearStats.winRate)}%</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Trades</p>
                   <p className="text-xl font-black text-cyan-500">{kpis.currentYearStats.totalTrades}</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Profit Factor</p>
                   <p className="text-xl font-black text-amber-500">{kpis.currentYearStats.profitFactor.toFixed(2)}</p>
                </div>
             </div>
          </CardContent>
        </Card>

      {/* Balance Evolution & Daily PNL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Balance Evolution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis.equityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Daily PNL</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.dailyPnlData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {kpis.dailyPnlData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


      {/* Win/Loss Ratio & Yearly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Win/Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{name: 'Winning Days', value: kpis.winningDays, color: '#10b981'}, {name: 'Losing Days', value: kpis.losingDays, color: '#ef4444'}]}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black">{Math.round(kpis.winRate)}%</span>
            </div>
          </CardContent>
          <div className="pb-8 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Winning Days</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Losing Days</div>
          </div>
        </Card>

        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Yearly Statistics - {currentMonth.getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.monthlyPnlData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="pnl" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Strategy & Setup Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strategy Analytics */}
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Strategy Analysis</CardTitle>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profitability by Strategy</p>
            </div>
            <select 
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="glass-input rounded-xl px-3 py-1 text-xs font-bold"
            >
              <option value="All">All Strategies</option>
              {Object.keys(kpis.strategyAnalysis).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedStrategy === 'All' ? (
                <BarChart data={Object.entries(kpis.strategyAnalysis).map(([name, data]) => ({ name, pnl: data.pnl }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {Object.entries(kpis.strategyAnalysis).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry[1].pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={kpis.strategyAnalysis[selectedStrategy]?.equity || []}>
                  <defs>
                    <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorStrategy)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Setup Analytics */}
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Setup Analysis</CardTitle>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Performance by Setup Type</p>
            </div>
            <select 
              value={selectedSetup}
              onChange={(e) => setSelectedSetup(e.target.value)}
              className="glass-input rounded-xl px-3 py-1 text-xs font-bold"
            >
              <option value="All">All Setups</option>
              {Object.keys(kpis.setupAnalysis).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedSetup === 'All' ? (
                <BarChart data={Object.entries(kpis.setupAnalysis).map(([name, data]) => ({ name, pnl: data.pnl }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {Object.entries(kpis.setupAnalysis).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry[1].pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={kpis.setupAnalysis[selectedSetup]?.equity || []}>
                  <defs>
                    <linearGradient id="colorSetup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSetup)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Log PNL Modal */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl z-[101] border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <Dialog.Title className="text-2xl font-bold">
                Quick Log for {selectedDay ? format(selectedDay, 'MMM dd, yyyy') : ''}
              </Dialog.Title>
              <Dialog.Close className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
              {isLocked && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600">
                  <Lock className="w-5 h-5" />
                  <p className="text-xs font-bold">This log is locked and cannot be modified.</p>
                </div>
              )}
              {isRestricted && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-600">
                  <Clock className="w-5 h-5" />
                  <p className="text-xs font-bold">Today's log can only be saved after 3:30 PM IST (Market Close).</p>
                </div>
              )}

              {/* View Toggler */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
                <button 
                  onClick={() => setLogView('quick')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${logView === 'quick' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-500' : 'text-zinc-500'}`}
                >
                  Quick Log
                </button>
                <button 
                  onClick={() => setLogView('detailed')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${logView === 'detailed' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-500' : 'text-zinc-500'}`}
                >
                  Detailed Analysis
                </button>
              </div>

              {logView === 'quick' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Quick Status Toggles */}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleQuickStatus('No Trade')}
                      disabled={isLocked || isRestricted || isSaving}
                      className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${formData.marketType === 'No Trade' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border-amber-500/20 text-amber-600 hover:bg-amber-500/5'} disabled:opacity-50 disabled:grayscale`}
                    >
                      No Trade
                    </button>
                    <button 
                      onClick={() => handleQuickStatus('Holiday')}
                      disabled={isLocked || isRestricted || isSaving}
                      className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${formData.marketType === 'Holiday' ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-blue-500/20 text-blue-600 hover:bg-blue-500/5'} disabled:opacity-50 disabled:grayscale`}
                    >
                      Holiday
                    </button>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                  
                  {/* Primary Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Asset</label>
                      <input 
                        type="text" 
                        value={formData.asset}
                        onChange={(e) => setFormData({...formData, asset: e.target.value})}
                        disabled={isLocked || isRestricted}
                        placeholder="e.g. BTCUSDT"
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50" 
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market</label>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                              <MoreVertical className="w-3 h-3 text-zinc-400" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-[200] min-w-[160px] animate-in zoom-in-95">
                              <DropdownMenu.Label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest p-2">Manage Market Options</DropdownMenu.Label>
                              {customOptions.markets.map(m => (
                                <div key={m} className="group flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
                                  <DropdownMenu.Item 
                                    onClick={() => handleSetDefault('marketType', m)}
                                    className="flex-1 text-xs font-bold p-2 cursor-pointer outline-none flex items-center justify-between"
                                  >
                                    {m}
                                    {defaultValues.marketType === m && <Check className="w-3 h-3 text-emerald-500" />}
                                  </DropdownMenu.Item>
                                  <div className="hidden group-hover:flex items-center gap-1 pr-2">
                                    <button onClick={() => handleEditOption('markets', m)} className="p-1 hover:text-emerald-500"><Settings2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteOption('markets', m)} className="p-1 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ))}
                              <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                              <DropdownMenu.Item 
                                onClick={() => {
                                  const val = prompt('Enter new market type:');
                                  if (val) handleUpdateOptions({ ...customOptions, markets: [...customOptions.markets, val] });
                                }}
                                className="text-xs font-black text-emerald-500 p-2 cursor-pointer outline-none hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"
                              >
                                + Add Custom Market
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                      <select 
                        value={formData.marketType}
                        onChange={(e) => setFormData({...formData, marketType: e.target.value as any})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                      >
                        {customOptions.markets.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="No Trade">No Trade</option>
                        <option value="Holiday">Holiday</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Direction</label>
                      <select 
                        value={formData.tradeDirection}
                        onChange={(e) => setFormData({...formData, tradeDirection: e.target.value as any})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                      >
                        <option value="Buy">Buy / Long</option>
                        <option value="Sell">Sell / Short</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantity / Size</label>
                      <input 
                        type="number" 
                        value={formData.positionSize}
                        onChange={(e) => setFormData({...formData, positionSize: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  {/* Profit/Loss remains in Quick Log, Entry/Exit shifted to Detailed */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Net Profit or Loss (₹)</label>
                      <input 
                        type="number" 
                        value={formData.profitLossAmount}
                        onChange={(e) => setFormData({...formData, profitLossAmount: e.target.value})}
                        disabled={isLocked || isRestricted}
                        placeholder="Enter direct P&L amount"
                        className="w-full glass-input border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl px-4 py-3 text-lg disabled:opacity-50 font-black" 
                      />
                    </div>
                  </div>

                  {/* Strategy & Setup Management */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Strategy</label>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                              <MoreVertical className="w-3 h-3 text-zinc-400" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-[200] min-w-[160px] animate-in zoom-in-95">
                              <DropdownMenu.Label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest p-2">Manage Strategy Options</DropdownMenu.Label>
                              {customOptions.strategies.map(s => (
                                <div key={s} className="group flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
                                  <DropdownMenu.Item 
                                    onClick={() => handleSetDefault('strategyUsed', s)}
                                    className="flex-1 text-xs font-bold p-2 cursor-pointer outline-none flex items-center justify-between"
                                  >
                                    {s}
                                    {defaultValues.strategyUsed === s && <Check className="w-3 h-3 text-emerald-500" />}
                                  </DropdownMenu.Item>
                                  <div className="hidden group-hover:flex items-center gap-1 pr-2">
                                    <button onClick={() => handleEditOption('strategies', s)} className="p-1 hover:text-emerald-500"><Settings2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteOption('strategies', s)} className="p-1 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ))}
                              <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                              <DropdownMenu.Item 
                                onClick={() => {
                                  const val = prompt('Enter new strategy name:');
                                  if (val) handleUpdateOptions({ ...customOptions, strategies: [...customOptions.strategies, val] });
                                }}
                                className="text-xs font-black text-emerald-500 p-2 cursor-pointer outline-none hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"
                              >
                                + Add Custom Strategy
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                      <select 
                        value={formData.strategyUsed}
                        onChange={(e) => setFormData({...formData, strategyUsed: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                      >
                        <option value="">Select Strategy</option>
                        {customOptions.strategies.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Setup</label>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                              <MoreVertical className="w-3 h-3 text-zinc-400" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-[200] min-w-[160px] animate-in zoom-in-95">
                              <DropdownMenu.Label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest p-2">Manage Setup Options</DropdownMenu.Label>
                              {customOptions.setups.map(s => (
                                <div key={s} className="group flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
                                  <DropdownMenu.Item 
                                    onClick={() => handleSetDefault('setupType', s)}
                                    className="flex-1 text-xs font-bold p-2 cursor-pointer outline-none flex items-center justify-between"
                                  >
                                    {s}
                                    {defaultValues.setupType === s && <Check className="w-3 h-3 text-emerald-500" />}
                                  </DropdownMenu.Item>
                                  <div className="hidden group-hover:flex items-center gap-1 pr-2">
                                    <button onClick={() => handleEditOption('setups', s)} className="p-1 hover:text-emerald-500"><Settings2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteOption('setups', s)} className="p-1 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ))}
                              <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                              <DropdownMenu.Item 
                                onClick={() => {
                                  const val = prompt('Enter new setup type:');
                                  if (val) handleUpdateOptions({ ...customOptions, setups: [...customOptions.setups, val] });
                                }}
                                className="text-xs font-black text-emerald-500 p-2 cursor-pointer outline-none hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"
                              >
                                + Add Custom Setup
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                      <select 
                        value={formData.setupType}
                        onChange={(e) => setFormData({...formData, setupType: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                      >
                        <option value="">Select Setup</option>
                        {customOptions.setups.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quick Notes</label>
                    <textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      disabled={isLocked || isRestricted}
                      rows={2}
                      className="w-full glass-input rounded-xl px-4 py-2 text-sm resize-none disabled:opacity-50" 
                      placeholder="Fast summary..."
                    />
                  </div>

                  {/* Permanent Custom Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custom Fields</label>
                      <button 
                        onClick={handleAddPermanentField}
                        disabled={isLocked || isRestricted}
                        className="text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add New Permanent Field
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {fieldDefinitions.map((label) => (
                        <div key={label} className="space-y-1">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
                          <input 
                            type="text" 
                            value={formData.customFields[label] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, customFields: { ...prev.customFields, [label]: e.target.value } }))}
                            disabled={isLocked || isRestricted}
                            placeholder={`Enter ${label}...`}
                            className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Execution - Shifted from Quick Log */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entry Price</label>
                      <input 
                        type="number" 
                        value={formData.entryPrice}
                        onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50 font-bold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Exit Price</label>
                      <input 
                        type="number" 
                        value={formData.exitPrice}
                        onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50 font-bold" 
                      />
                    </div>
                  </div>

                  {/* Detailed Analysis Section */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Stop Loss</label>
                      <input type="number" value={formData.stopLoss} onChange={(e) => setFormData({...formData, stopLoss: e.target.value})} disabled={isLocked || isRestricted} className="w-full glass-input border-rose-500/20 rounded-xl px-3 py-2 text-sm disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Take Profit</label>
                      <input type="number" value={formData.takeProfit} onChange={(e) => setFormData({...formData, takeProfit: e.target.value})} disabled={isLocked || isRestricted} className="w-full glass-input border-emerald-500/20 rounded-xl px-3 py-2 text-sm disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">R:R Ratio</label>
                      <input type="number" value={formData.riskRewardRatio} onChange={(e) => setFormData({...formData, riskRewardRatio: e.target.value})} disabled={isLocked || isRestricted} className="w-full glass-input border-cyan-500/20 rounded-xl px-3 py-2 text-sm disabled:opacity-50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trading Session</label>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                              <MoreVertical className="w-3 h-3 text-zinc-400" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-[200] min-w-[160px] animate-in zoom-in-95">
                              <DropdownMenu.Label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest p-2">Manage Session Options</DropdownMenu.Label>
                              {customOptions.sessions.map(s => (
                                <div key={s} className="group flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
                                  <DropdownMenu.Item 
                                    onClick={() => handleSetDefault('sessionTraded', s)}
                                    className="flex-1 text-xs font-bold p-2 cursor-pointer outline-none flex items-center justify-between"
                                  >
                                    {s}
                                    {defaultValues.sessionTraded === s && <Check className="w-3 h-3 text-emerald-500" />}
                                  </DropdownMenu.Item>
                                  <div className="hidden group-hover:flex items-center gap-1 pr-2">
                                    <button onClick={() => handleEditOption('sessions', s)} className="p-1 hover:text-emerald-500"><Settings2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteOption('sessions', s)} className="p-1 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ))}
                              <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                              <DropdownMenu.Item 
                                onClick={() => {
                                  const val = prompt('Enter new session name:');
                                  if (val) handleUpdateOptions({ ...customOptions, sessions: [...customOptions.sessions, val] });
                                }}
                                className="text-xs font-black text-emerald-500 p-2 cursor-pointer outline-none hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"
                              >
                                + Add Custom Session
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                      <select 
                        value={formData.sessionTraded}
                        onChange={(e) => setFormData({...formData, sessionTraded: e.target.value as any})}
                        disabled={isLocked || isRestricted}
                        className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                      >
                        {customOptions.sessions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex justify-between">
                        <span>Trade Quality</span>
                        <span className="text-emerald-500">{formData.tradeQualityRating}/10</span>
                      </label>
                      <input 
                        type="range" min="1" max="10" 
                        value={formData.tradeQualityRating}
                        onChange={(e) => setFormData({...formData, tradeQualityRating: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full accent-emerald-500 disabled:opacity-50" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex justify-between">
                        <span>Confidence</span>
                        <span className="text-emerald-500">{formData.confidenceLevel}/10</span>
                      </label>
                      <input 
                        type="range" min="1" max="10" 
                        value={formData.confidenceLevel}
                        onChange={(e) => setFormData({...formData, confidenceLevel: e.target.value})}
                        disabled={isLocked || isRestricted}
                        className="w-full accent-emerald-500 disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entry Time</label>
                      <input type="time" value={formData.entryTime} onChange={(e) => setFormData({...formData, entryTime: e.target.value})} disabled={isLocked || isRestricted} className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Exit Time</label>
                      <input type="time" value={formData.exitTime} onChange={(e) => setFormData({...formData, exitTime: e.target.value})} disabled={isLocked || isRestricted} className="w-full glass-input rounded-xl px-4 py-2 text-sm disabled:opacity-50" />
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSavePnl}
                disabled={isSaving || isLocked || isRestricted}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 sticky bottom-0"
              >
                {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isLocked ? 'Log Locked' : isRestricted ? 'Restricted Until 3:30 PM' : 'Complete Detailed Log'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function StatCard({ label, value, color = 'text-zinc-900 dark:text-zinc-100', prefix = '' }: { label: string, value: string, color?: string, prefix?: string }) {
  return (
    <div className="bg-white/80 dark:bg-zinc-800/50 p-6 rounded-3xl space-y-1 backdrop-blur-md border border-white dark:border-white/5 shadow-sm bg-gradient-to-br from-white to-emerald-50/20 dark:from-transparent dark:to-transparent">
      <p className="text-[10px] font-bold text-emerald-600 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{prefix}{value}</p>
    </div>
  );
}

function KPICard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend?: 'up' | 'down' }) {
  return (
    <Card className="border-none glass-card rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 glass-input rounded-2xl group-hover:scale-110 transition-transform flex items-center justify-center">
            {icon}
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {trend === 'up' ? '+12%' : '-5%'}
            </span>
          )}
        </div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black mt-1 truncate">{value}</h3>
      </CardContent>
    </Card>
  );
}

function InsightRow({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-500 font-medium">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
