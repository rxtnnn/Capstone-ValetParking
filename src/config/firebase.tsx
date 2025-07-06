import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Get this from Firebase Console > Project Settings > General > Web apps
const firebaseConfig = {
  apiKey: "AIzaSyAybqLE0GfvHgdAZv7wngv1vtyHc4LxcRs",
  authDomain: "valet-parking-system-16b37.firebaseapp.com",
  projectId: "valet-parking-system-16b37",
  storageBucket: "valet-parking-system-16b37.firebasestorage.app",
  messagingSenderId: "274532765385",
  appId: "1:274532765385:web:c22828cf286cc412928718",
  measurementId: "G-P1QBE36BTZ" // Optional, for Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db };
export default app;