import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getDb } from '@/lib/mongodb';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only run if it's Sunday (0 is Sunday in JS Date)
    const now = new Date();
    const isSunday = now.getDay() === 0;
    
    // We can still trigger it manually for testing, but by default we check for Sunday
    const isManual = request.url.includes('manual=true');
    
    if (!isSunday && !isManual) {
      return NextResponse.json({ success: true, message: 'Skipping: Reports are only sent on Sundays.' });
    }

    // Set up Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // 1. Fetch all users from MongoDB
    const db = await getDb();
    const users = await db.collection('users').find({}).toArray();
    
    const reportsSent = [];

    // 2. Loop through users and generate report if needed
    for (const user of users) {
      // Check schedule - only send if weekly (or if manual test)
      if (user.settings?.reportSchedule === 'weekly' || isManual) {
        
        // Fetch trades for the last week for this user
        const weekTrades = await db.collection('trades').find({
          userId: user.uid,
          tradeDate: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }).toArray();

        const totalPnl = weekTrades.reduce((acc, t) => acc + (t.profitLossAmount || 0), 0);
        
        const mailOptions = {
          from: `"MomentumTrade" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: `Weekly Performance Report - ${format(now, 'MMM d, yyyy')}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #10b981; margin-bottom: 5px;">Hello ${user.displayName || 'Trader'},</h2>
              <p style="color: #6b7280; margin-top: 0;">Here is your weekly trading performance report.</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0; font-size: 12px; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Weekly Net PNL</p>
                <p style="margin: 5px 0 0; font-size: 32px; font-weight: 900; color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">₹${totalPnl.toLocaleString('en-IN')}</p>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">View Deep Analytics</a>
              </div>
              
              <p style="margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center;">
                You received this because your report schedule is set to "Weekly" in MomentumTrade.
              </p>
            </div>
          `,
        };

        try {
          await transporter.sendMail(mailOptions);
          reportsSent.push(user.email);
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error);
        }
      }
    }

    return NextResponse.json({ success: true, message: `Sent reports to ${reportsSent.length} users.`, reportsSent });
  } catch (error: any) {
    console.error('Error generating reports:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
