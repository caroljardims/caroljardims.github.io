import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBpxEcHGdrjEP7fubkoE7qjHhY-AEwz68c",
  authDomain: "decifragem.firebaseapp.com",
  projectId: "decifragem",
  storageBucket: "decifragem.firebasestorage.app",
  messagingSenderId: "1064683986108",
  appId: "1:1064683986108:web:11dc3117e3cffcadafc4b9",
  measurementId: "G-RJKZKDMP2S",
  databaseURL: "https://decifragem-default-rtdb.firebaseio.com",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

if (typeof window !== 'undefined') {
  getAnalytics(app);
}
