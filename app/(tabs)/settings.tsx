// app/(tabs)/settings.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('currentUser');
        router.replace('/auth/login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>⚙️ 설정</Text>

            {user ? (
                <>
                    <Text style={styles.info}>이름: {user.name}</Text>
                    <Text style={styles.info}>이메일: {user.email}</Text>
                    <Text style={styles.info}>캠퍼스: {user.campus}</Text>
                    <Text style={styles.info}>소속: {user.division}</Text>
                    <Text style={styles.info}>역할: {user.role}</Text>

                    {user.role === '교역자' && (
                        <TouchableOpacity
                            style={styles.adminButton}
                            onPress={() => router.push('/pastor')}
                        >
                            <Text style={styles.adminText}>📌 교역자 전용 페이지</Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <Text style={styles.info}>로그인 정보가 없습니다.</Text>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 40, padding: 20,backgroundColor: '#f9fafb' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    info: { fontSize: 16, marginBottom: 8 },
    logoutButton: {
        marginTop: 30,
        backgroundColor: '#ef4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    logoutText: { color: '#fff', fontWeight: 'bold' },
    adminButton: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    adminText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
