export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  reportSchedule: 'daily' | 'weekly' | 'monthly';
  emailSettings: {
    tradeReminders: boolean;
    disciplineWarnings: boolean;
    reportSentConfirmation: boolean;
  };
  timezone: string;
  riskSettings: {
    maxDailyLoss: number;
    maxTradesPerDay: number;
  };
  customFieldDefinitions?: string[];
  customDropdownOptions?: {
    markets: string[];
    strategies: string[];
    setups: string[];
    sessions: string[];
  };
  defaultValues?: Record<string, string>;
  reportFrequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  customReportSchedule?: {
    days: string[]; // ['Monday', 'Wednesday', ...]
    time: string; // '10:00'
  };
  riskControlSettings?: {
    maxDailyLossAmount: number;
    maxTradesPerDay: number;
    emailAlertsEnabled: boolean;
  };
}

export interface Trade {
  id: string;
  _id?: string;
  userId: string;
  tradeDate: string;
  entryTime?: string;
  exitTime?: string;
  marketType: 'Forex' | 'Crypto' | 'Stocks' | 'Futures' | 'Options' | 'No Trade' | 'Holiday';
  asset: string;
  tradeDirection: 'Buy' | 'Sell' | 'N/A';
  positionSize: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  profitLossAmount: number;
  profitLossPercentage?: number;
  fees?: number;
  leverageUsed?: number;
  sessionTraded?: 'London' | 'New York' | 'Asian';
  strategyUsed?: string;
  setupType?: string;
  tradeQualityRating?: number;
  confidenceLevel?: number;
  screenshotUrl?: string;
  notes: string;
  status: 'Open' | 'Closed';
  isLocked?: boolean;
  customFields?: Record<string, string>;
  createdAt: string;
}

export interface PsychologyLog {
  id: string;
  userId: string;
  tradeId?: string;
  date: string;
  moodBefore: string;
  moodAfter: string;
  emotionalState: 'Fear' | 'Greed' | 'FOMO' | 'Revenge trading' | 'Confidence' | 'Calm';
  stressLevel: number; // 1-10
  sleepQuality: number; // 1-10
  focusLevel: number; // 1-10
  disciplineScore: number; // 1-100
  followedStrategy: boolean;
  followedRiskManagement: boolean;
  impulsiveTrade: boolean;
  overtradingIndicator: boolean;
  meditationCompleted: boolean;
  externalDistractions: boolean;
  confidenceScore: number; // 1-100
  createdAt: string;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  rules: string[];
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  totalTrades: number;
  winRate: number;
  lossRate: number;
  disciplineScore: number;
  aiInsights: string[];
  createdAt: string;
}
