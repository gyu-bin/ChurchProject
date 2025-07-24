import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlarmListScreen() {
    const [userId, setUserId] = useState<string | null>(null);
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

    const { data: alarms = [], isLoading } = useQuery<any[]>({
        queryKey: ['alarms', userId],
        queryFn: async () => {
            if (!userId) return [];
            const q = query(collection(db, 'alarms'), where('userId', '==', userId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });

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
