// NOTE: Do NOT commit real secrets. The API key below was removed and replaced with
// an environment variable so CI and local builds must provide it at runtime.
export const firebaseConfig = {
  "projectId": "studio-537578177-70262",
  "appId": "1:480187512777:web:b25aa3297dbf61ba7a9a18",
  // Use NEXT_PUBLIC_FIREBASE_API_KEY for client builds. Rotate/revoke the leaked key immediately.
  "apiKey": process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '<REDACTED>',
  "authDomain": "studio-537578177-70262.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "480187512777"
};
