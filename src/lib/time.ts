export async function getISTTime(): Promise<Date> {
  try {
    // If we are in the browser, call our internal proxy to avoid CORS
    const isBrowser = typeof window !== 'undefined';
    const url = isBrowser 
      ? '/api/time' 
      : 'https://worldtimeapi.org/api/timezone/Asia/Kolkata';

    const response = await fetch(url, {
      cache: 'no-store'
    });
    const data = await response.json();
    return new Date(data.datetime);
  } catch (error) {
    console.error('Failed to fetch IST time, falling back to system time:', error);
    // Fallback: system time converted to IST (UTC+5:30)
    const now = new Date();
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
    return istTime;
  }
}

export function isMarketClosed(istDate: Date): boolean {
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM
  return totalMinutes >= marketCloseMinutes;
}
