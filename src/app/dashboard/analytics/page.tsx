'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { getTrades } from '@/app/actions/trades';
import { Trade } from '@/types';
import { useTheme } from '@teispace/next-themes';
import { Activity, TrendingUp, BarChart3, PieChart as PieChartIcon, ShieldAlert, Zap } from 'lucide-react';
import { 
  format, 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  parseISO,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function fetchAnalytics() {
      if (!user) return;
      try {
        const fetchedTrades = await getTrades(user.uid);
        setTrades(fetchedTrades);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [user]);

  const analytics = useMemo(() => {
    if (trades.length === 0) return null;

    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );

    // Periodic PNL
    const dailyPnlMap: Record<string, number> = {};
    const weeklyPnlMap: Record<string, number> = {};
    const monthlyPnlMap: Record<string, number> = {};

    let cumulative = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    
    const equityData = sortedTrades.map(t => {
      const pnl = (t.profitLossAmount || 0);
      cumulative += pnl;
      
      if (cumulative > peakEquity) peakEquity = cumulative;
      const drawdown = peakEquity - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      const date = parseISO(t.tradeDate);
      const dayKey = format(date, 'yyyy-MM-dd');
      const weekKey = format(startOfWeek(date), 'yyyy-ww');
      const monthKey = format(date, 'yyyy-MM');

      dailyPnlMap[dayKey] = (dailyPnlMap[dayKey] || 0) + pnl;
      weeklyPnlMap[weekKey] = (weeklyPnlMap[weekKey] || 0) + pnl;
      monthlyPnlMap[monthKey] = (monthlyPnlMap[monthKey] || 0) + pnl;

      return {
        date: format(date, 'MMM d'),
        pnl: cumulative,
        drawdown: drawdown
      };
    });

    const dailyPnlData = Object.entries(dailyPnlMap).map(([date, pnl]) => ({ date: format(parseISO(date), 'MMM d'), pnl })).slice(-10);
    const weeklyPnlData = Object.entries(weeklyPnlMap).map(([week, pnl]) => ({ name: `Week ${week.split('-')[1]}`, pnl })).slice(-8);
    const monthlyPnlData = Object.entries(monthlyPnlMap).map(([month, pnl]) => ({ name: format(parseISO(`${month}-01`), 'MMM yy'), pnl })).slice(-6);

    const marketStats: Record<string, number> = {};
    let wins = 0;
    let losses = 0;
    let totalRR = 0;

    trades.forEach(t => {
      const pnl = t.profitLossAmount || 0;
      const market = t.marketType || 'Other';
      marketStats[market] = (marketStats[market] || 0) + pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
      
      totalRR += (t.riskRewardRatio || 0);
    });

    const marketData = Object.entries(marketStats).map(([name, value]) => ({ name, value }));
    const winLossData = [
      { name: 'Wins', value: wins, color: '#10b981' },
      { name: 'Losses', value: losses, color: '#ef4444' }
    ];

    const totalWinAmount = trades.filter(t => (t.profitLossAmount || 0) > 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
    const totalLossAmount = Math.abs(trades.filter(t => (t.profitLossAmount || 0) < 0).reduce((acc, t) => acc + (t.profitLossAmount || 0), 0));
    
    const avgWinner = wins > 0 ? totalWinAmount / wins : 0;
    const avgLoser = losses > 0 ? totalLossAmount / losses : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;
    const avgRR = trades.length > 0 ? totalRR / trades.length : 0;

    return { 
      equityData, 
      dailyPnlData,
      weeklyPnlData,
      monthlyPnlData,
      marketData, 
      winLossData, 
      totalTrades: trades.length,
      avgWinner,
      avgLoser,
      profitFactor,
      avgRR,
      maxDrawdown,
      expectancy: (trades.length > 0) ? (totalWinAmount - totalLossAmount) / trades.length : 0
    };
  }, [trades]);

  if (!mounted) return null;

  const chartColors = {
    grid: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    text: theme === 'dark' ? '#71717a' : '#a1a1aa',
    tooltipBg: theme === 'dark' ? '#18181b' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#27272a' : '#e4e4e7',
    tooltipText: theme === 'dark' ? '#ffffff' : '#09090b',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
            Performance Analytics
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Detailed breakdown of your trading performance.</p>
        </div>
        <div className="flex gap-4">
           <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Win Rate</p>
              <p className="text-xl font-black text-emerald-500">{analytics ? Math.round((analytics.winLossData[0].value / analytics.totalTrades) * 100) : 0}%</p>
           </div>
           <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Profit Factor</p>
              <p className="text-xl font-black text-cyan-500">{analytics ? analytics.profitFactor.toFixed(2) : 0}</p>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[600px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : !analytics ? (
        <Card className="p-20 text-center border-dashed">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-12 h-12 text-zinc-300" />
            <p className="text-zinc-500 text-lg">Not enough data to generate deep analytics. Log more trades!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Main Growth and Drawdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Equity Curve & Performance (₹)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.equityData}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-8">
               <Card className="border-none shadow-2xl bg-gradient-to-br from-zinc-900 to-black text-white overflow-hidden relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest font-black">
                       <Zap className="w-4 h-4 text-emerald-500" />
                       Risk Metrics
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase">Max Drawdown</p>
                       <p className="text-3xl font-black text-rose-500">₹{analytics.maxDrawdown.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase">Average R:R</p>
                       <p className="text-3xl font-black text-cyan-500">1:{analytics.avgRR.toFixed(1)}</p>
                    </div>
                    <div>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase">Profit Factor</p>
                       <p className="text-3xl font-black text-emerald-500">{analytics.profitFactor.toFixed(2)}</p>
                    </div>
                 </CardContent>
               </Card>

               <Card className="border-none shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5">
                 <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-widest font-black flex items-center gap-2">
                       <PieChartIcon className="w-4 h-4 text-emerald-500" />
                       Win/Loss Distribution
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="h-[200px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.winLossData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analytics.winLossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black">{Math.round((analytics.winLossData[0].value / analytics.totalTrades) * 100)}%</span>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </div>

          {/* Periodic PNL Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <Card className="border-none shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5">
                <CardHeader>
                   <CardTitle className="text-sm font-bold uppercase tracking-tighter">Daily PNL</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.dailyPnlData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                         <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 8}} />
                         <YAxis hide />
                         <Tooltip 
                           contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px' }}
                         />
                         <Bar dataKey="pnl">
                            {analytics.dailyPnlData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>

             <Card className="border-none shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5">
                <CardHeader>
                   <CardTitle className="text-sm font-bold uppercase tracking-tighter">Weekly PNL</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.weeklyPnlData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 8}} />
                         <YAxis hide />
                         <Tooltip 
                           contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px' }}
                         />
                         <Bar dataKey="pnl">
                            {analytics.weeklyPnlData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>

             <Card className="border-none shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5">
                <CardHeader>
                   <CardTitle className="text-sm font-bold uppercase tracking-tighter">Monthly PNL</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.monthlyPnlData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 8}} />
                         <YAxis hide />
                         <Tooltip 
                           contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px' }}
                         />
                         <Bar dataKey="pnl">
                            {analytics.monthlyPnlData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
          </div>

          {/* Deep Insights Summary */}
          <Card className="border-none shadow-2xl bg-zinc-50 dark:bg-zinc-900/60 p-8">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Average Winner</p>
                  <p className="text-2xl font-black text-emerald-500">₹{analytics.avgWinner.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Average Loser</p>
                  <p className="text-2xl font-black text-rose-500">₹{analytics.avgLoser.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Profit Factor</p>
                  <p className="text-2xl font-black text-cyan-500">{analytics.profitFactor.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Expectancy</p>
                  <p className="text-2xl font-black text-violet-500">₹{analytics.expectancy.toLocaleString('en-IN')}</p>
                </div>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
}
