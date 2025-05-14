import 'dotenv/config';

export default {
    expo: {
        name: 'ChurchAppExpo',
        slug: 'ChurchAppExpo',
        version: '1.0.0',

        ios: {
            bundleIdentifier: 'com.rbqls6651.churchappexpo',
        },
        android: {
            package: 'com.rbqls6651.churchappexpo',
        },

        // ✅ runtimeVersion 설정 필수
        runtimeVersion: {
            policy: 'appVersion',
        },

        // ✅ EAS Updates URL 설정 필수
        updates: {
            url: 'https://u.expo.dev/52398581-ab99-4c0d-a8bb-dc94a4a5f439',
        },

        extra: {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            eas: {
                projectId: '52398581-ab99-4c0d-a8bb-dc94a4a5f439',
            },
        },
    },
};
