'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { askTradingAI } from '@/app/actions/ai';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  ChevronRight, 
  TrendingUp,
  BrainCircuit,
  MessageSquareText
} from 'lucide-react';

export function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hello! I've analyzed your recent trades. Want to discuss your performance or need a strategy review?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await askTradingAI(user.uid, userMessage, messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })));

      if (response.content) {
        setMessages(prev => [...prev, { role: 'ai', content: response.content || '' }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: response.error || "Sorry, I'm having trouble connecting right now." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "An error occurred. Check your connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors ${isOpen ? 'bg-zinc-900 text-white' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[100] w-[380px] h-[550px] bg-white dark:bg-zinc-950 rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <BrainCircuit className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-black text-lg">Trading Mentor</h3>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Powered by Gemini AI</p>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-zinc-900 text-white rounded-tr-none font-medium shadow-lg shadow-black/5' 
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
                  }`}>
                    {m.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert prose-emerald max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-table:border prose-table:border-zinc-200 dark:prose-table:border-zinc-800 prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your strategy..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl px-5 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
