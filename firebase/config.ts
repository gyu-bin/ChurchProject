import { getAnalytics, isSupported } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAtkt7DLTq_LdYEsqiHEWgzZLGkBa4d2JI",
    authDomain: "churchappexpo.firebaseapp.com",
    projectId: "churchappexpo",
    storageBucket: "gs://churchappexpo.firebasestorage.app",
    messagingSenderId: "650084657232",
    appId: "1:650084657232:web:a772970ae7b4154ff14955",
    measurementId: "G-Z6F6G7BG5T"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase Local Cache 활성화 (오프라인 지원)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('⚠️ The current browser does not support persistence.');
    }
});

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Analytics initialized');
    } else {
        console.log('⚠️ Analytics not supported in this environment');
    }
});

export { analytics, app, db, storage };

