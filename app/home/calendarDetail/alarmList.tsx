import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function AlarmListScreen() {
    const [userId, setUserId] = useState<string | null>(null);
    const [alarms, setAlarms] = useState<any[]>([]);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const user = JSON.parse(raw);
                setUserId(user.uid || user.email);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, 'alarms'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setAlarms(data);
        });

        return () => unsubscribe();
    }, [userId]);

    const deleteAlarm = async (id: string) => {
        await deleteDoc(doc(db, 'alarms', id));
        Alert.alert('🗑️ 삭제 완료', '알람이 삭제되었습니다.');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top }}>
            {/* 상단 헤더 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ddd',
                }}
            >
                {/* 뒤로가기 버튼 */}
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>

                {/* 가운데 타이틀 */}
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                    예약된 알림
                </Text>

                {/* 오른쪽 빈 영역 */}
                <View style={{ width: 24 }} />
            </View>

            {/* 알림 목록 */}
            <View style={{ flex: 1, padding: 16 }}>
                <FlatList
                    data={alarms}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>
                            예약된 알림이 없습니다.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View
                            style={{
                                marginBottom: 12,
                                backgroundColor: '#f9f9f9',
                                padding: 12,
                                borderRadius: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 1,
                            }}
                        >
                            <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 4 }}>
                                {item.title}
                            </Text>
                            <Text style={{ color: '#555', marginBottom: 6 }}>
                                ⏰ 알림 시간: {dayjs(item.date.toDate ? item.date.toDate() : item.date).format('YYYY-MM-DD HH:mm')}
                            </Text>
                            <TouchableOpacity onPress={() => deleteAlarm(item.id)}>
                                <Text style={{ color: 'red', fontWeight: '500' }}>삭제</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </View>
    );
}
