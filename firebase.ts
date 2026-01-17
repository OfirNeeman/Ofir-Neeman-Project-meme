import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAX...", // המפתח שלך
  authDomain: "mememaster-99e48.firebaseapp.com",
  projectId: "mememaster-99e48",
  storageBucket: "mememaster-99e48.firebasestorage.app",
  messagingSenderId: "42101581710",
  appId: "1:42101581710:web:ce4dbfa06a476afa9e26df"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // זה הייצוא הכי חשוב