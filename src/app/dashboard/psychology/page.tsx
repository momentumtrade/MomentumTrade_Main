'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Battery, HeartPulse, ShieldAlert, Target, Zap, Activity, Info } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getTrades, getPsychologyLogs } from '@/app/actions/trades';
import { PsychologyLog, Trade } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function PsychologyPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<PsychologyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [fetchedTrades, fetchedLogs] = await Promise.all([
          getTrades(user.uid),
          getPsychologyLogs(user.uid)
        ]);
        setTrades(fetchedTrades);
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error loading psychology data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const stats = useMemo(() => {
    if (trades.length === 0 && logs.length === 0) return null;

    const avgDiscipline = logs.length > 0 
      ? logs.reduce((acc, l) => acc + (l.disciplineScore || 0), 0) / logs.length 
      : 85; // Default if no logs

    const impulsiveTrades = trades.filter(t => t.tradeQualityRating && t.tradeQualityRating < 3).length;
    const revengeTrades = logs.filter(l => l.emotionalState === 'Revenge trading').length;
    const fomoTrades = logs.filter(l => l.emotionalState === 'FOMO').length;

    const emotionsData = [
      { name: 'Fear', value: logs.filter(l => l.emotionalState === 'Fear').length },
      { name: 'Greed', value: logs.filter(l => l.emotionalState === 'Greed').length },
      { name: 'FOMO', value: fomoTrades },
      { name: 'Calm', value: logs.filter(l => l.emotionalState === 'Calm').length },
      { name: 'Confidence', value: logs.filter(l => l.emotionalState === 'Confidence').length },
    ].filter(e => e.value > 0);

    const radarData = [
      { subject: 'Focus', A: logs.reduce((acc, l) => acc + (l.focusLevel || 0), 0) / (logs.length || 1) * 10, fullMark: 100 },
      { subject: 'Discipline', A: avgDiscipline, fullMark: 100 },
      { subject: 'Energy', A: logs.reduce((acc, l) => acc + (l.sleepQuality || 0), 0) / (logs.length || 1) * 10, fullMark: 100 },
      { subject: 'Risk Control', A: logs.filter(l => l.followedRiskManagement).length / (logs.length || 1) * 100, fullMark: 100 },
      { subject: 'Strategy', A: logs.filter(l => l.followedStrategy).length / (logs.length || 1) * 100, fullMark: 100 },
    ];

    return {
      avgDiscipline,
      impulsiveTrades,
      revengeTrades,
      fomoTrades,
      emotionsData,
      radarData,
      totalLogs: logs.length
    };
  }, [trades, logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-emerald-500">
            Trading Psychology
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Master your mind, master the markets.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-emerald-500/10">
           <Zap className="w-4 h-4 text-emerald-500" />
           <span className="text-xs font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Live Analysis</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Discipline Score" 
          value={Math.round(stats?.avgDiscipline || 0).toString()} 
          icon={<BrainCircuit className="w-6 h-6 text-violet-500" />} 
          status={stats?.avgDiscipline! > 80 ? 'Optimal' : 'Needs Work'}
        />
        <KPICard 
          title="Impulsive Trades" 
          value={stats?.impulsiveTrades.toString() || '0'} 
          icon={<ShieldAlert className="w-6 h-6 text-rose-500" />} 
          status={stats?.impulsiveTrades! > 5 ? 'High Risk' : 'Controlled'}
        />
        <KPICard 
          title="Mental Energy" 
          value="High" 
          icon={<Battery className="w-6 h-6 text-emerald-500" />} 
          status="Ready to Trade"
        />
        <KPICard 
          title="Total Logs" 
          value={stats?.totalLogs.toString() || '0'} 
          icon={<Activity className="w-6 h-6 text-blue-500" />} 
          status="Consistency"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Behavioral Radar */}
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <Target className="w-5 h-5 text-violet-500" />
              Behavioral Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats?.radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.4}
                  />
                </RadarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emotional Distribution */}
        <Card className="border-none glass-card rounded-[32px] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <HeartPulse className="w-5 h-5 text-rose-500" />
              Emotional States
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] flex flex-col md:flex-row items-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.emotionsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats?.emotionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
             <div className="flex flex-col gap-2 w-full md:w-48">
                {stats?.emotionsData.map((e, i) => (
                  <div key={e.name} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold text-zinc-500">{e.name}</span>
                     </div>
                     <span className="text-xs font-black">{e.value}</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Psychology Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card className="border-none glass-card rounded-[32px] overflow-hidden bg-gradient-to-br from-violet-500/5 to-emerald-500/5">
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  AI Psychological Insights
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-4 bg-white/50 dark:bg-zinc-800/50 rounded-2xl border border-violet-500/10">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Consistency Alert</p>
                  <p className="text-xs text-zinc-500 mt-1">You tend to trade more impulsively during the New York session. Consider a 10-minute meditation before the open.</p>
               </div>
               <div className="p-4 bg-white/50 dark:bg-zinc-800/50 rounded-2xl border border-emerald-500/10">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Performance Peak</p>
                  <p className="text-xs text-zinc-500 mt-1">Your win rate is 15% higher when you report a "Calm" or "Confidence" mood pre-trade.</p>
               </div>
            </CardContent>
         </Card>

         <Card className="border-none glass-card rounded-[32px] overflow-hidden">
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Behavioral Tips
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                  {[
                    "Stop trading after 3 consecutive losses to avoid revenge trading.",
                    "Review your setup checklist before every entry to reduce FOMO.",
                    "Ensure 7+ hours of sleep for optimal focus levels.",
                    "Maintain a daily gratitude journal to stay emotionally balanced."
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                       <div className="w-5 h-5 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center text-[10px] font-black">
                         {i + 1}
                       </div>
                       <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{tip}</p>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, status }: { title: string, value: string, icon: React.ReactNode, status: string }) {
  return (
    <Card className="border-none glass-card rounded-[32px] overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-2xl shadow-sm">
            {icon}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
            {status}
          </span>
        </div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black mt-1">{value}</h3>
      </CardContent>
    </Card>
  );
}
