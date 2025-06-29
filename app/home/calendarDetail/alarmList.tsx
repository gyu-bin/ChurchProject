import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';

export default function AlarmListScreen() {
    const [userId, setUserId] = useState<string | null>(null);
    const [alarms, setAlarms] = useState<any[]>([]);

    useEffect(() => {
        // AsyncStorage에서 현재 사용자 정보 가져오기
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const user = JSON.parse(raw);
                setUserId(user.uid || user.email); // Firestore에 저장한 userId 기준
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
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 16 }}>📋 예약된 알림 목록</Text>
            <FlatList
                data={alarms}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text>알림이 없습니다.</Text>}
                renderItem={({ item }) => (
                    <View style={{ marginBottom: 12, backgroundColor: '#eee', padding: 12, borderRadius: 8 }}>
                        <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
                        <Text>알림 시간: {dayjs(item.date.toDate ? item.date.toDate() : item.date).format('YYYY-MM-DD HH:mm')}</Text>
                        <TouchableOpacity onPress={() => deleteAlarm(item.id)} style={{ marginTop: 8 }}>
                            <Text style={{ color: 'red' }}>삭제</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}
