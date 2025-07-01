import 'dotenv/config';

export default {
    expo: {
        name: 'ChurchAppExpo',
        slug: 'ChurchAppExpo',
        platforms: ['ios', 'android'],
        version: '1.0.0',
        orientation: 'portrait',
        owner: 'rbqls6651',
        scheme: 'churchappexpo',
        icon: './assets/images/icon.png',
        userInterfaceStyle: 'automatic',
        newArchEnabled: false, // ✅ 안정 버전은 비활성화
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.rbqls6651.churchappexpo',
        },
        android: {
            package: 'com.rbqls6651.churchappexpo',
            // versionCode 제거: EAS에서 자동 증가
            edgeToEdgeEnabled: true,
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon.png',
                backgroundColor: '#ffffff',
            },
            googleServicesFile: './google-services.json',
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            'expo-web-browser',
            'expo-notifications',
            [
                'expo-splash-screen',
                {
                    image: './assets/images/splash-icon.png',
                    imageWidth: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#ffffff',
                },
            ],
            'expo-font',
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            eas: {
                projectId: '52398581-ab99-4c0d-a8bb-dc94a4a5f439',
            },
            OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
        },
        runtimeVersion: '1.0.0',
        updates: {
            url: 'https://u.expo.dev/52398581-ab99-4c0d-a8bb-dc94a4a5f439',
        },
    },
};
