export default {
    expo: {
        name: 'ChurchAppExpo',
        slug: 'ChurchAppExpo',
        version: '1.0.0',
        ios: {
            bundleIdentifier: 'com.rbqls6651.churchappexpo', // ✅ 앱 고유한 ID (자유롭게 설정)
        },
        android: {
            package: 'com.rbqls6651.churchappexpo', // ✅ Android도 함께 설정 추천
        },
        updates: {
            url: 'https://u.expo.dev/52398581-ab99-4c0d-a8bb-dc94a4a5f439',
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        extra: {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            eas: {
                projectId: '52398581-ab99-4c0d-a8bb-dc94a4a5f439',
            },
        },
    },
};
