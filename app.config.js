// app.config.js
import 'dotenv/config';

export default {
    expo: {
        name: 'ChurchAppExpo',
        slug: 'ChurchAppExpo', // ✅ 반드시 소문자, EAS 프로젝트 slug와 일치
        platforms: ["ios", "android"],
        version: '1.0.0',
        orientation: 'portrait',
        owner: 'rbqls6651',
        scheme: 'churchappexpo',
        icon: './assets/images/icon.png',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.rbqls6651.churchappexpo',
        },
        android: {
            googleServicesFile: './google-services.json',
            package: 'com.rbqls6651.churchappexpo',
            versionCode: 1,
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon.png',
                backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/images/splash-icon.png',
                    imageWidth: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#ffffff',
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            eas: {
                projectId: '52398581-ab99-4c0d-a8bb-dc94a4a5f439',
            },
            OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '', // ✅ EAS 빌드 시 env 주입됨
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        updates: {
            url: 'https://u.expo.dev/52398581-ab99-4c0d-a8bb-dc94a4a5f439',
        },
    },
};
