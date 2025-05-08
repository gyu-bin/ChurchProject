// firebase/config.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ 추가

const firebaseConfig = {
    apiKey: "AIzaSyAtkt7DLTq_LdYEsqiHEWgzZLGkBa4d2JI",
    authDomain: "churchappexpo.firebaseapp.com",
    projectId: "churchappexpo",
    storageBucket: "churchappexpo.firebasestorage.app",
    messagingSenderId: "650084657232",
    appId: "1:650084657232:web:a772970ae7b4154ff14955",
    measurementId: "G-Z6F6G7BG5T"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
