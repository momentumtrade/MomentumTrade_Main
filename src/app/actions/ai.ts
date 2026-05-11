'use server';

import { getTrades } from './trades';

export async function askTradingAI(userId: string, message: string, history: any[]) {
  const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
  
  if (!API_KEY) {
    return { error: 'No Gemini API key found in .env' };
  }

  try {
    const trades = await getTrades(userId);
    
    // Calculate performance stats for context
    const recentTrades = trades.slice(0, 50);
    const tradeSummary = recentTrades.map(t => ({
      asset: t.asset,
      pnl: t.profitLossAmount,
      strategy: t.strategyUsed,
      setup: t.setupType,
      direction: t.tradeDirection,
      date: t.tradeDate,
      quality: t.tradeQualityRating,
      confidence: t.tradeConfidenceRating,
      rr: t.riskRewardRatio
    }));

    const totalPnl = tradeSummary.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const winRate = tradeSummary.length > 0 
      ? (tradeSummary.filter(t => (t.pnl || 0) > 0).length / tradeSummary.length) * 100 
      : 0;

    const systemPrompt = `You are the MomentumTrade AI Mentor. 
    User Stats (Last 50 trades): P&L ₹${totalPnl.toLocaleString('en-IN')}, Win Rate ${winRate.toFixed(1)}%.
    Data for Audit: ${JSON.stringify(tradeSummary.slice(0, 30))}
    
    Instructions:
    1. Direct & Data-Driven: Use the numbers above to answer questions. 
    2. Audit Performance: Point out specific assets/strategies that are losing capital.
    3. Mentorship: Be a firm, professional trading mentor. Focus on psychology and risk.
    4. Formatting: Use Markdown (tables, bold, lists).
    5. Currency: Always use ₹ (INR).`;

    // Construct history for REST API
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      {
        role: "model",
        parts: [{ text: "Understood. I have reviewed your trade data and I am ready to audit your performance. How can I help you improve today?" }]
      },
      // Filter out the initial welcome message from UI and map roles
      ...history.filter(h => !h.content.includes("analyzed your recent trades"))
        .map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        })),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    // Try to discover which models are actually available for this key
    let modelName = 'gemini-1.5-flash'; // Default
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      const listData = await listResp.json();
      if (listData.models && listData.models.length > 0) {
        // Find a model that supports generateContent
        const supportedModel = listData.models.find((m: any) => 
          m.supportedGenerationMethods.includes('generateContent') && 
          (m.name.includes('1.5-flash') || m.name.includes('pro'))
        );
        if (supportedModel) {
          modelName = supportedModel.name.split('/').pop();
          console.log(`Discovered supported model: ${modelName}`);
        }
      }
    } catch (e) {
      console.warn('Could not list models, using default.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return { error: `Gemini API Error: ${data.error.message}` };
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return { content: data.candidates[0].content.parts[0].text };
    }

    return { error: 'Received an empty or malformed response from Gemini.' };
  } catch (error: any) {
    console.error('Network Error during AI Fetch:', error);
    return { error: `Network error: ${error.message}` };
  }
}
