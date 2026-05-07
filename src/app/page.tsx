'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, BrainCircuit, LineChart, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
            MomentumTrade
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link 
            href="/login" 
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-full transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Trading Psychology</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              The ultimate trading discipline monitoring platform. Track your edge, analyze your emotions, and become a consistently profitable trader.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-medium rounded-full transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Journaling Free <ArrowRight className="w-5 h-5" />
              </Link>
              <a 
                href="#features"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-lg font-medium rounded-full transition-colors flex items-center justify-center"
              >
                Explore Features
              </a>
            </div>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="mt-32 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard 
            icon={<BrainCircuit className="w-6 h-6 text-emerald-400" />}
            title="Psychology Tracking"
            description="Log your emotions before and after trades. Identify emotional triggers that lead to losses."
            delay={0.1}
          />
          <FeatureCard 
            icon={<LineChart className="w-6 h-6 text-cyan-400" />}
            title="Advanced Analytics"
            description="Visualize your performance with interactive charts, win rates, and drawdowns."
            delay={0.2}
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
            title="Discipline Monitoring"
            description="Track rule-breaking, revenge trading, and overtrading with our proprietary discipline score."
            delay={0.3}
          />
          <FeatureCard 
            icon={<BarChart3 className="w-6 h-6 text-cyan-400" />}
            title="AI Insights"
            description="Get automated, actionable insights about your trading patterns and session performance."
            delay={0.4}
          />
        </div>
      </main>
      
      {/* Dashboard Preview mockup */}
      <div className="container mx-auto px-6 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 overflow-hidden shadow-2xl backdrop-blur-sm"
        >
          <div className="aspect-video bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 relative overflow-hidden group">
            {/* Abstract Dashboard shapes */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full blur-3xl mix-blend-screen"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-500 rounded-full blur-3xl mix-blend-screen"></div>
            </div>
            <div className="text-center z-10">
              <h3 className="text-2xl font-bold text-zinc-300 mb-2">Premium Analytics Dashboard</h3>
              <p className="text-zinc-500">Sign in to unlock full capabilities</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center mb-4 border border-zinc-800">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
