'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Activity,
  ChevronDown,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getTrades } from '@/app/actions/trades';
import { getUserSettings } from '@/app/actions/user';
import { Trade } from '@/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export default function JournalPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    marketType: 'All',
    strategy: 'All',
    setup: 'All',
    session: 'All',
    direction: 'All',
    minPnl: '',
    maxPnl: '',
    minRating: '0',
    dateStart: '',
    dateEnd: ''
  });

  const [options, setOptions] = useState({
    markets: [] as string[],
    strategies: [] as string[],
    setups: [] as string[],
    sessions: [] as string[]
  });

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        const [fetchedTrades, settings] = await Promise.all([
          getTrades(user.uid),
          getUserSettings(user.uid)
        ]);
        setTrades(fetchedTrades);
        
        if (settings?.customDropdownOptions) {
          setOptions({
            markets: settings.customDropdownOptions.markets || [],
            strategies: settings.customDropdownOptions.strategies || [],
            setups: settings.customDropdownOptions.setups || [],
            sessions: settings.customDropdownOptions.sessions || []
          });
        }
      } catch (error) {
        console.error("Error initializing journal:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesSearch = !filters.search || 
        trade.asset?.toLowerCase().includes(filters.search.toLowerCase()) ||
        trade.notes?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesMarket = filters.marketType === 'All' || trade.marketType === filters.marketType;
      const matchesStrategy = filters.strategy === 'All' || trade.strategyUsed === filters.strategy;
      const matchesSetup = filters.setup === 'All' || trade.setupType === filters.setup;
      const matchesSession = filters.session === 'All' || trade.sessionTraded === filters.session;
      const matchesDirection = filters.direction === 'All' || trade.tradeDirection === filters.direction;
      
      const pnl = trade.profitLossAmount || 0;
      const matchesMinPnl = !filters.minPnl || pnl >= parseFloat(filters.minPnl);
      const matchesMaxPnl = !filters.maxPnl || pnl <= parseFloat(filters.maxPnl);
      
      const rating = trade.tradeQualityRating ?? 0;
      const matchesRating = rating >= parseInt(filters.minRating);
      
      let matchesDate = true;
      if (filters.dateStart || filters.dateEnd) {
        const tDate = parseISO(trade.tradeDate);
        const start = filters.dateStart ? startOfDay(parseISO(filters.dateStart)) : new Date(0);
        const end = filters.dateEnd ? endOfDay(parseISO(filters.dateEnd)) : new Date(8640000000000000);
        matchesDate = isWithinInterval(tDate, { start, end });
      }

      return matchesSearch && matchesMarket && matchesStrategy && matchesSetup && 
             matchesSession && matchesDirection && matchesMinPnl && matchesMaxPnl && 
             matchesRating && matchesDate;
    });
  }, [trades, filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      marketType: 'All',
      strategy: 'All',
      setup: 'All',
      session: 'All',
      direction: 'All',
      minPnl: '',
      maxPnl: '',
      minRating: '0',
      dateStart: '',
      dateEnd: ''
    });
  };

  return (
    <div className="min-h-screen space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
            Advanced Journal <span className="text-emerald-500">Analytics</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Deep filter and audit your entire trading history.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${showFilters ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Filters */}
        {showFilters && (
          <div className="lg:col-span-3 space-y-6 animate-in slide-in-from-left-4 duration-500">
            <Card className="border-none glass-card rounded-[32px] overflow-hidden sticky top-8">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-black">Filter Engine</CardTitle>
                  <button onClick={resetFilters} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">Reset All</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input 
                      type="text" placeholder="Asset, notes..." 
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-sm border-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Market & Direction */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Market</label>
                    <select 
                      value={filters.marketType}
                      onChange={e => setFilters({...filters, marketType: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-2.5 text-sm font-bold border-none"
                    >
                      <option value="All">All Markets</option>
                      {options.markets.map(m => <option key={m} value={m}>{m}</option>)}
                      <option value="No Trade">No Trade</option>
                      <option value="Holiday">Holiday</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Direction</label>
                    <select 
                      value={filters.direction}
                      onChange={e => setFilters({...filters, direction: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-2.5 text-sm font-bold border-none"
                    >
                      <option value="All">All Directions</option>
                      <option value="Buy">Buy / Long</option>
                      <option value="Sell">Sell / Short</option>
                    </select>
                  </div>
                </div>

                {/* Strategy & Setup */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Strategy</label>
                    <select 
                      value={filters.strategy}
                      onChange={e => setFilters({...filters, strategy: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-2.5 text-sm font-bold border-none"
                    >
                      <option value="All">All Strategies</option>
                      {options.strategies.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Setup</label>
                    <select 
                      value={filters.setup}
                      onChange={e => setFilters({...filters, setup: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-2.5 text-sm font-bold border-none"
                    >
                      <option value="All">All Setups</option>
                      {options.setups.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* PNL Range */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Profit/Loss Range (₹)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" placeholder="Min" 
                      value={filters.minPnl}
                      onChange={e => setFilters({...filters, minPnl: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3 py-2 text-xs font-bold border-none"
                    />
                    <input 
                      type="number" placeholder="Max" 
                      value={filters.maxPnl}
                      onChange={e => setFilters({...filters, maxPnl: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3 py-2 text-xs font-bold border-none"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Timeframe</label>
                  <div className="space-y-2">
                    <input 
                      type="date" 
                      value={filters.dateStart}
                      onChange={e => setFilters({...filters, dateStart: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3 py-2 text-xs font-bold border-none"
                    />
                    <input 
                      type="date" 
                      value={filters.dateEnd}
                      onChange={e => setFilters({...filters, dateEnd: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3 py-2 text-xs font-bold border-none"
                    />
                  </div>
                </div>

                {/* Quality */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Min Quality</label>
                    <span className="text-[10px] font-black text-emerald-500">{filters.minRating}+</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" 
                    value={filters.minRating}
                    onChange={e => setFilters({...filters, minRating: e.target.value})}
                    className="w-full accent-emerald-500" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content / Table */}
        <div className={`${showFilters ? 'lg:col-span-9' : 'lg:col-span-12'} transition-all duration-500`}>
          <Card className="border-none glass-card rounded-[32px] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-black">Trade History</CardTitle>
                <p className="text-xs font-bold text-zinc-400 mt-1">Showing {filteredTrades.length} of {trades.length} entries</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Execution Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Asset & Market</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Strategy/Setup</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Direction</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Quality</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Net P&L (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-emerald-500/20 border-b-emerald-500"></div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Scanning database...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-50">
                            <Activity className="w-12 h-12 text-zinc-300" />
                            <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No matching trades found</p>
                            <button onClick={resetFilters} className="text-xs font-black text-emerald-500 underline uppercase tracking-widest">Clear all filters</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all duration-200">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:scale-110 transition-transform">
                                <CalendarIcon className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-zinc-600 dark:text-zinc-300">
                                {format(parseISO(trade.tradeDate || trade.createdAt), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-0.5">
                              <p className="font-black text-zinc-800 dark:text-zinc-200">{trade.asset}</p>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{trade.marketType}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold">{trade.strategyUsed || 'No Strategy'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{trade.setupType || 'No Setup'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trade.tradeDirection === 'Buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {trade.tradeDirection}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < ((trade.tradeQualityRating ?? 0) / 2) ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                                ))}
                              </div>
                              <span className="text-[9px] font-black text-zinc-400 mt-1">{trade.tradeQualityRating}/10</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="space-y-0.5">
                              <p className={`text-base font-black ${(trade.profitLossAmount || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {(trade.profitLossAmount || 0) >= 0 ? '+' : ''}₹{(trade.profitLossAmount || 0).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[10px] font-bold text-zinc-400">
                                {trade.riskRewardRatio > 0 ? `1:${trade.riskRewardRatio} R` : 'Manual P&L'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
