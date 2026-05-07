'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveTrade } from '@/app/actions/trades';
import { Trade } from '@/types';
import { ArrowLeft, Save, Activity } from 'lucide-react';
import Link from 'next/link';

export default function NewTradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    asset: '',
    marketType: 'Forex',
    tradeDirection: 'Buy',
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
    sessionTraded: 'London',
    strategyUsed: '',
    setupType: '',
    tradeQualityRating: '5',
    confidenceLevel: '5',
    notes: '',
    tradeDate: new Date().toISOString().split('T')[0],
    entryTime: '',
    exitTime: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const tradeData: any = {
        userId: user.uid,
        ...formData,
        entryPrice: Number(formData.entryPrice),
        exitPrice: Number(formData.exitPrice),
        stopLoss: Number(formData.stopLoss),
        takeProfit: Number(formData.takeProfit),
        positionSize: Number(formData.positionSize),
        riskRewardRatio: Number(formData.riskRewardRatio),
        profitLossAmount: Number(formData.profitLossAmount),
        profitLossPercentage: Number(formData.profitLossPercentage),
        fees: Number(formData.fees),
        leverageUsed: Number(formData.leverageUsed),
        tradeQualityRating: Number(formData.tradeQualityRating),
        confidenceLevel: Number(formData.confidenceLevel),
        status: 'Closed',
        createdAt: new Date().toISOString()
      };

      const result = await saveTrade(tradeData);
      if (result.success) {
        router.push('/dashboard/journal');
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Error saving: ", error);
      alert("Failed to save. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/journal" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Trade Entry</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Record every detail of your setup and execution.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none glass-card">
              <CardHeader>
                <CardTitle>Core Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Market Type</label>
                    <select name="marketType" value={formData.marketType} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3">
                      <option value="Forex">Forex</option>
                      <option value="Crypto">Crypto</option>
                      <option value="Stocks">Stocks</option>
                      <option value="Futures">Futures</option>
                      <option value="Options">Options</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Asset / Symbol</label>
                    <input required name="asset" value={formData.asset} onChange={handleChange} placeholder="e.g. BTC/USDT or AAPL" type="text" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Direction</label>
                    <select name="tradeDirection" value={formData.tradeDirection} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3">
                      <option value="Buy">Buy (Long)</option>
                      <option value="Sell">Sell (Short)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Trade Date</label>
                    <input required name="tradeDate" value={formData.tradeDate} onChange={handleChange} type="date" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Entry Time</label>
                    <input name="entryTime" value={formData.entryTime} onChange={handleChange} type="time" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Exit Time</label>
                    <input name="exitTime" value={formData.exitTime} onChange={handleChange} type="time" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card">
              <CardHeader>
                <CardTitle>Execution & Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Entry Price</label>
                    <input required name="entryPrice" value={formData.entryPrice} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Exit Price</label>
                    <input required name="exitPrice" value={formData.exitPrice} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Position Size</label>
                    <input required name="positionSize" value={formData.positionSize} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Stop Loss</label>
                    <input name="stopLoss" value={formData.stopLoss} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3 ring-rose-500/30 focus:ring-rose-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Take Profit</label>
                    <input name="takeProfit" value={formData.takeProfit} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3 ring-emerald-500/30 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Leverage</label>
                    <input name="leverageUsed" value={formData.leverageUsed} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                </div>

                <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Profit / Loss (₹)</label>
                      <input required name="profitLossAmount" value={formData.profitLossAmount} onChange={handleChange} type="number" step="any" className="w-full text-3xl font-black bg-transparent border-none p-0 focus:ring-0 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">P/L Percentage (%)</label>
                      <input name="profitLossPercentage" value={formData.profitLossPercentage} onChange={handleChange} type="number" step="any" className="w-full text-3xl font-black bg-transparent border-none p-0 focus:ring-0 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Fees (₹)</label>
                    <input name="fees" value={formData.fees} onChange={handleChange} type="number" step="any" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Risk-Reward Ratio</label>
                    <input name="riskRewardRatio" value={formData.riskRewardRatio} onChange={handleChange} type="number" step="any" placeholder="e.g. 2.5" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card">
              <CardHeader>
                <CardTitle>Strategy & Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Strategy Used</label>
                    <input name="strategyUsed" value={formData.strategyUsed} onChange={handleChange} placeholder="e.g. ICT, SMC, Trend Follow" type="text" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Setup Type</label>
                    <input name="setupType" value={formData.setupType} onChange={handleChange} placeholder="e.g. Breakout, Retest" type="text" className="w-full glass-input rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Session</label>
                    <select name="sessionTraded" value={formData.sessionTraded} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3">
                      <option value="London">London</option>
                      <option value="New York">New York</option>
                      <option value="Asian">Asian</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows={5} className="w-full glass-input rounded-2xl px-4 py-3 resize-none" placeholder="What was your logic? Any mistakes?"></textarea>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-none glass-card">
              <CardHeader>
                <CardTitle>Psychology & Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Confidence Level</label>
                    <span className="text-emerald-500 font-bold">{formData.confidenceLevel}/10</span>
                  </div>
                  <input name="confidenceLevel" value={formData.confidenceLevel} onChange={handleChange} type="range" min="1" max="10" className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Trade Quality Rating</label>
                    <span className="text-emerald-500 font-bold">{formData.tradeQualityRating}/10</span>
                  </div>
                  <input name="tradeQualityRating" value={formData.tradeQualityRating} onChange={handleChange} type="range" min="1" max="10" className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Screenshot URL</label>
                  <input name="screenshotUrl" value={(formData as any).screenshotUrl || ''} onChange={handleChange} placeholder="https://imgur.com/..." type="text" className="w-full glass-input rounded-xl px-4 py-3" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-emerald-500 dark:bg-emerald-600 text-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-cyan-600 opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <h3 className="text-2xl font-black mb-4">Ready to Save?</h3>
                <p className="text-emerald-50 text-sm mb-8 font-medium">Make sure all execution data matches your brokerage statement for accurate analytics.</p>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-white text-emerald-600 font-black rounded-2xl shadow-2xl shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.02]"
                >
                  {loading ? <Activity className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  Save Detailed Log
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
