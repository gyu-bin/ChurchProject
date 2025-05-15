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
