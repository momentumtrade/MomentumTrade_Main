'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { 
  LayoutDashboard, 
  LineChart, 
  BookOpen, 
  Settings, 
  LogOut,
  BrainCircuit,
  Bell,
  Menu,
  X,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { getISTTime } from '@/lib/time';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [istDate, setIstDate] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch online time on mount
    getISTTime().then(setIstDate);
    
    // Update locally every second
    const interval = setInterval(() => {
      setIstDate(prev => prev ? new Date(prev.getTime() + 1000) : null);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Journal', href: '/dashboard/journal', icon: BookOpen },
    { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart },
    { name: 'Psychology', href: '/dashboard/psychology', icon: BrainCircuit },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300 relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 glass border-r-0
        flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <img src="/logo.jpeg" alt="Momentum Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
              Momentum
            </span>
          </Link>
          <button className="md:hidden p-2" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 rounded-2xl transition-all group"
              >
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform group-hover:text-emerald-500" />
                <span className="font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 px-3 py-3 glass rounded-2xl mb-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-emerald-500/20" />
            ) : (
              <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {user.displayName || 'Trader'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-8 transition-all duration-300 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-zinc-400">
               <span className="text-xs font-bold uppercase tracking-widest">System Status:</span>
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               <span className="text-xs font-bold text-emerald-500">Live</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-5 glass px-4 py-2 rounded-2xl">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-1">IST Date</span>
                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                  {istDate ? format(istDate, 'do MMMM, yyyy') : 'Loading...'}
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-200 dark:border-zinc-800" />
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-1 flex items-center gap-1">
                  <Clock className="w-2 h-2 text-emerald-500" /> IST Time
                </span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {istDate ? format(istDate, 'hh:mm:ss a') : '00:00:00 --'}
                </span>
              </div>
            </div>

            <Link href="/dashboard/analytics" className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-all group">
              <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black">Report</span>
            </Link>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-4 w-80 glass rounded-[32px] shadow-2xl border border-emerald-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
                    <h3 className="font-black text-sm">Notifications</h3>
                    <button onClick={clearAll} className="text-[10px] font-black uppercase text-zinc-400 hover:text-rose-500 transition-colors">Clear All</button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center">
                        <Bell className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 font-bold">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => { markAsRead(n.id); setIsNotificationsOpen(false); }}
                          className={`p-4 border-b border-zinc-100 dark:border-zinc-900 last:border-0 hover:bg-emerald-500/5 transition-colors cursor-pointer ${!n.read ? 'bg-emerald-500/[0.02]' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 p-1.5 rounded-lg ${
                              n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                              n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                              n.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {n.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : 
                               n.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
                               n.type === 'error' ? <X className="w-3 h-3" /> :
                               <Info className="w-3 h-3" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-zinc-800 dark:text-zinc-200">{n.title}</p>
                              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{n.message}</p>
                              <p className="text-[9px] text-zinc-400 mt-1 uppercase font-bold">{format(parseISO(n.timestamp), 'HH:mm')}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 relative">
          {/* Background Decorative Blobs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-7xl mx-auto relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
