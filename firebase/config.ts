// firebase/config.ts
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

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
const db = getFirestore(app); // ✅ 추가

// ✅ Analytics 지원 여부 확인 후 초기화
let analytics: ReturnType<typeof getAnalytics> | null = null;

isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Analytics initialized');
    } else {
        console.log('⚠️ Analytics not supported in this environment');
    }
});

export { app, db, analytics }; // ✅ db export 추가
