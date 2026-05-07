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
  Menu
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { getTrades, saveTrade } from '@/app/actions/trades';
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
    exitTime: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchDashboardData();
    }
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

    return {
      winningDays,
      losingDays,
      avgPnlPerDay: trades.length > 0 ? totalProfit / (Object.keys(groupedByDay).length || 1) : 0,
      maxDrawdown,
      totalProfit,
      winRate: actualTrades.length > 0 ? (winningTrades / actualTrades.length) * 100 : 0,
      equityData,
      dailyPnlMap: groupedByDay,
      dailyPnlData,
      weeklyPnlData,
      monthlyPnlData,
      profitFactor,
      avgRR: actualTrades.length > 0 ? totalRR / actualTrades.length : 0,
      currentMonthStats: {
        pnl: monthPnl,
        winRate: monthWinRate,
        profitFactor: monthProfitFactor,
        totalTrades: monthTrades.length
      },
      currentYearStats: {
        pnl: yearPnl,
        winRate: yearWinRate,
        profitFactor: yearProfitFactor,
        totalTrades: yearTrades.length
      }
    };
  }, [trades, currentMonth]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const dateKey = format(day, 'yyyy-MM-dd');
    const existingTrade = trades.find(t => format(parseISO(t.tradeDate), 'yyyy-MM-dd') === dateKey);
    
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
        exitTime: existingTrade.exitTime || ''
      });
    } else {
      setFormData({
        asset: '',
        marketType: 'Forex',
        tradeDirection: 'Buy',
        entryPrice: '100',
        exitPrice: '110',
        stopLoss: '95',
        takeProfit: '125',
        positionSize: '10',
        riskRewardRatio: '2.5',
        profitLossAmount: '100',
        profitLossPercentage: '10',
        fees: '0',
        leverageUsed: '1',
        sessionTraded: 'London',
        strategyUsed: '',
        setupType: '',
        tradeQualityRating: '5',
        confidenceLevel: '5',
        notes: '',
        entryTime: '10:00',
        exitTime: '11:00'
      });
    }
    setIsDialogOpen(true);
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

      {/* Monthly Calendar - Week by Week */}
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
              {/* Quick Status Toggles */}
              <div className="flex gap-4">
                <button 
                  onClick={() => handleQuickStatus('No Trade')}
                  className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${formData.marketType === 'No Trade' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border-amber-500/20 text-amber-600 hover:bg-amber-500/5'}`}
                >
                  No Trade
                </button>
                <button 
                  onClick={() => handleQuickStatus('Holiday')}
                  className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${formData.marketType === 'Holiday' ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-blue-500/20 text-blue-600 hover:bg-blue-500/5'}`}
                >
                  Holiday
                </button>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
              {/* Asset Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Asset / Symbol</label>
                  <input 
                    type="text" 
                    value={formData.asset}
                    onChange={(e) => setFormData({...formData, asset: e.target.value})}
                    placeholder="e.g. BTCUSDT"
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market</label>
                  <select 
                    value={formData.marketType}
                    onChange={(e) => setFormData({...formData, marketType: e.target.value as any})}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                  >
                    <option value="Forex">Forex</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Stocks">Stocks</option>
                    <option value="Futures">Futures</option>
                    <option value="Options">Options</option>
                  </select>
                </div>
              </div>

              {/* Execution */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Direction</label>
                  <select 
                    value={formData.tradeDirection}
                    onChange={(e) => setFormData({...formData, tradeDirection: e.target.value as any})}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                  >
                    <option value="Buy">Buy / Long</option>
                    <option value="Sell">Sell / Short</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Session</label>
                  <select 
                    value={formData.sessionTraded}
                    onChange={(e) => setFormData({...formData, sessionTraded: e.target.value as any})}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm"
                  >
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                  </select>
                </div>
              </div>

              {/* Entry / Exit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entry Price</label>
                  <input 
                    type="number" 
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Exit Price</label>
                  <input 
                    type="number" 
                    value={formData.exitPrice}
                    onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm" 
                  />
                </div>
              </div>

              {/* PNL Section */}
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Profit / Loss (₹)</label>
                    <input 
                      type="number" 
                      value={formData.profitLossAmount}
                      onChange={(e) => setFormData({...formData, profitLossAmount: e.target.value})}
                      className="w-full bg-transparent border-none text-2xl font-black text-emerald-600 dark:text-emerald-400 focus:ring-0 p-0" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">PNL %</label>
                    <input 
                      type="number" 
                      value={formData.profitLossPercentage}
                      onChange={(e) => setFormData({...formData, profitLossPercentage: e.target.value})}
                      className="w-full bg-transparent border-none text-2xl font-black text-emerald-600 dark:text-emerald-400 focus:ring-0 p-0" 
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Stop Loss</label>
                  <input type="number" value={formData.stopLoss} onChange={(e) => setFormData({...formData, stopLoss: e.target.value})} className="w-full glass-input rounded-lg px-2 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Take Profit</label>
                  <input type="number" value={formData.takeProfit} onChange={(e) => setFormData({...formData, takeProfit: e.target.value})} className="w-full glass-input rounded-lg px-2 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">R:R Ratio</label>
                  <input type="number" value={formData.riskRewardRatio} onChange={(e) => setFormData({...formData, riskRewardRatio: e.target.value})} className="w-full glass-input rounded-lg px-2 py-2 text-xs" />
                </div>
              </div>

              {/* Strategy & Setup */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Strategy Used</label>
                  <input type="text" value={formData.strategyUsed} onChange={(e) => setFormData({...formData, strategyUsed: e.target.value})} className="w-full glass-input rounded-xl px-4 py-2 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Setup Type</label>
                  <input type="text" value={formData.setupType} onChange={(e) => setFormData({...formData, setupType: e.target.value})} className="w-full glass-input rounded-xl px-4 py-2 text-sm" />
                </div>
              </div>

              {/* Ratings */}
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
                    className="w-full accent-emerald-500" 
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
                    className="w-full accent-emerald-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Notes & Journal</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full glass-input rounded-xl px-4 py-2 text-sm resize-none" 
                  placeholder="Emotional state, mistakes, etc."
                />
              </div>

              <button 
                onClick={handleSavePnl}
                disabled={isSaving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-0"
              >
                {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Complete Detailed Log
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
