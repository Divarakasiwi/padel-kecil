import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyXXXX",
  authDomain: "padelkecilfery.firebaseapp.com",
  projectId: "padelkecilfery",
  storageBucket: "padelkecilfery.appspot.com",
  messagingSenderId: "674058994745",
  appId: "1:674058994745:web:xxxxxxxx",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
