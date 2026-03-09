import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAX...", // השאירי את המפתח המקורי שלך כאן
  authDomain: "mememaster-99e48.firebaseapp.com",
  projectId: "mememaster-99e48",
  messagingSenderId: "42101581710",
  appId: "1:42101581710:web:ce4dbfa06a476afa9e26df"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);