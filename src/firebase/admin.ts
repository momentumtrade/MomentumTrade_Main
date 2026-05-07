import * as admin from 'firebase-admin';

if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'momentumtrade-3e65a',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'demo@demo.com',
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase admin initialization error', error);
  }
}

const adminDb = admin.apps.length ? admin.firestore() : null as unknown as admin.firestore.Firestore;
const adminAuth = admin.apps.length ? admin.auth() : null as unknown as admin.auth.Auth;

export { adminDb, adminAuth };
