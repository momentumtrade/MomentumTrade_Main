# MomentumTrade 📈

A production-ready, scalable, modern, and fully responsive Trading Discipline Monitoring Platform built with Next.js (App Router), Firebase, and Tailwind CSS.

## 🚀 Features

- **Trading Journal:** Log trades with advanced details (Entry, Exit, R:R, Fees, Strategy).
- **Psychology & Discipline Tracking:** Deep tracking of emotional state, focus, and discipline score.
- **Analytics Dashboard:** Advanced charting (Recharts) for performance, PnL, Win Rate, Equity Curves.
- **AI Insights Engine:** Intelligent observations about your trading sessions and emotional triggers.
- **Automated Reporting:** Nodemailer-based API route for scheduling email reports.
- **Modern UI:** Premium fintech aesthetic using ShadCN UI, Tailwind CSS, and Framer Motion.
- **Authentication:** Secure Firebase Google Auth and profile management.

## 🏗 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend:** Next.js API Routes, Firebase (Auth, Firestore, Storage), Firebase Admin.
- **Email Delivery:** Nodemailer + Gmail SMTP.
- **Deployment:** Vercel.

---

## 🛠 Local Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd MomentumTrade
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory and copy the contents from `.env.example`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"

SMTP_EMAIL=your_gmail_email
SMTP_PASSWORD=your_gmail_app_password

CRON_SECRET=your_cron_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Google Sign-in).
4. Enable **Firestore Database** (Start in production mode, update rules later).
5. Enable **Storage**.
6. Generate a new private key from **Project Settings > Service Accounts** and copy the `client_email` and `private_key` to your `.env.local`. *(Note: Be careful with the `\n` in the private key).*

### 4. Gmail SMTP Setup
1. Go to your Google Account Settings > Security.
2. Enable 2-Step Verification.
3. Search for "App Passwords" and create a new app password for "Mail".
4. Copy the generated 16-character password into `SMTP_PASSWORD` in your `.env.local`.
5. Set `SMTP_EMAIL` to your Gmail address.

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployment Instructions (Vercel)

Deploying MomentumTrade to Vercel is seamless since it's a Next.js app.

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and create a new project.
3. Import your GitHub repository.
4. **Important:** Add all your environment variables from `.env.local` into the Vercel Environment Variables section.
   - *For the `FIREBASE_PRIVATE_KEY`, copy the exact string including `\n` characters.*
5. Set the Framework Preset to **Next.js**.
6. Click **Deploy**.

### Setting Up Cron Jobs for Automated Reports
To trigger the automated email reports, you can use Vercel Cron Jobs or an external service like cron-job.org.
The API endpoint for sending reports is `/api/cron/report`.

**Using Vercel Cron Jobs:**
Create a `vercel.json` file in your root directory:
```json
{
  "crons": [
    {
      "path": "/api/cron/report",
      "schedule": "0 8 * * 1" // Runs every Monday at 8:00 AM
    }
  ]
}
```
Make sure to secure your cron endpoint by passing the `Authorization: Bearer <CRON_SECRET>` header if using an external cron provider.

---

## 🔒 Security & Database Rules
Always ensure your Firebase Firestore rules are secure for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /trades/{tradeId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    // Apply similar rules for psychology_logs and reports
  }
}
```

Enjoy tracking your trading discipline! 🚀
