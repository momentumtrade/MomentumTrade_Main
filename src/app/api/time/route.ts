import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000) // Timeout after 5s
    });
    if (!response.ok) throw new Error('Failed to fetch from WorldTimeAPI');
    const data = await response.json();
    return NextResponse.json({ datetime: data.datetime });
  } catch (error) {
    console.error('Time API error, using server IST fallback:', error);
    // Manual IST calculation: UTC + 5.5 hours
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    return NextResponse.json({ 
      datetime: istTime.toISOString(),
      fallback: true 
    });
  }
}
