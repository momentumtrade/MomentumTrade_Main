'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { getTrades } from '@/app/actions/trades';
import { Trade } from '@/types';

export default function JournalPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      if (!user) return;
      try {
        const fetchedTrades = await getTrades(user.uid);
        setTrades(fetchedTrades);
      } catch (error) {
        console.error("Error fetching trades:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();
  }, [user]);

  const filteredTrades = trades.filter(trade => 
    trade.asset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.marketType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Review and analyze your past trades.</p>
        </div>
        <Link 
          href="/dashboard/journal/new"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Trade Entry
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Recent Trades</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search trades..." 
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <Filter className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 rounded-tl-lg">Date</th>
                  <th className="px-6 py-3">Asset</th>
                  <th className="px-6 py-3">Direction</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3">R:R</th>
                  <th className="px-6 py-3 rounded-tr-lg">P&L</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No trades found. Log your first trade!
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4">{new Date(trade.tradeDate || trade.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium">{trade.asset}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${trade.tradeDirection === 'Buy' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                          {trade.tradeDirection}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${(trade.profitLossAmount || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                          {(trade.profitLossAmount || 0) >= 0 ? 'Win' : 'Loss'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{trade.riskRewardRatio > 0 ? `1:${trade.riskRewardRatio.toFixed(1)}` : '-1R'}</td>
                      <td className={`px-6 py-4 font-bold ${(trade.profitLossAmount || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(trade.profitLossAmount || 0) >= 0 ? '+' : ''}₹{(trade.profitLossAmount || 0).toLocaleString('en-IN')}
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
  );
}
