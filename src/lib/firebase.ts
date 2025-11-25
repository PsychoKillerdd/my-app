// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl6PCD_3PdEWYyLUZ6pXD7LpKkN5UwyMg",
  authDomain: "proyectotitulo-7966d.firebaseapp.com",
  projectId: "proyectotitulo-7966d",
  storageBucket: "proyectotitulo-7966d.firebasestorage.app",
  messagingSenderId: "409458732489",
  appId: "1:409458732489:web:36ade9d2b7a5e63b550c18"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
