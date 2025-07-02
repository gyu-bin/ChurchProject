// app/intro.tsx
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {useAuth} from "@/hooks/useAuth";

const { width, height } = Dimensions.get('window');

export default function IntroScreen() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        const timer = setTimeout(() => {
            if (user) {
                router.replace('/(tabs)/home'); // 🔁 로그인된 경우 홈으로
            } else {
                router.replace('/auth/login'); // 🔁 로그인 안 된 경우 로그인으로
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [user, loading]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Image
                source={require('@/assets/intro.jpeg')} // ✅ 원하는 이미지 넣기
                style={styles.fullImage}
                resizeMode="cover"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // 배경색 원하는 대로 조정
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height,
    },
});
