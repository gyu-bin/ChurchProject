// env.d.ts

declare namespace NodeJS {
    interface ProcessEnv {
        OPENAI_API_KEY: string;
    }
}

declare module 'expo-constants' {
    export const manifest: {
        extra: {
            OPENAI_API_KEY: string;
        };
    };

    export const expoConfig: {
        extra: {
            OPENAI_API_KEY: string;
        };
    };
}

declare module '@env' {
    export const FIREBASE_API_KEY: string;
    export const FIREBASE_AUTH_DOMAIN: string;
    export const FIREBASE_PROJECT_ID: string;
    export const FIREBASE_STORAGE_BUCKET: string;
    export const FIREBASE_MESSAGING_SENDER_ID: string;
    export const FIREBASE_APP_ID: string;
    export const FIREBASE_MEASUREMENT_ID: string;
}
