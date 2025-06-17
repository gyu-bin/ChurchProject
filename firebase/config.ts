import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // ✅ 스토리지도 초기화 가능

const firebaseConfig = {
    apiKey: "AIzaSyAtkt7DLTq_LdYEsqiHEWgzZLGkBa4d2JI",
    authDomain: "churchappexpo.firebaseapp.com",
    projectId: "churchappexpo",
    storageBucket: "churchappexpo.appspot.com", // ✅ 수정된 부분
    messagingSenderId: "650084657232",
    appId: "1:650084657232:web:a772970ae7b4154ff14955",
    measurementId: "G-Z6F6G7BG5T"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app); // ✅ 필요 시 export 가능

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Analytics initialized');
    } else {
        console.log('⚠️ Analytics not supported in this environment');
    }
});

export { app, db, analytics, storage }; // ✅ storage도 export 가능
