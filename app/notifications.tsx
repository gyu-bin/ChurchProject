import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    getDocs,
    query,
    where,
    deleteDoc,
    doc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const currentUser = JSON.parse(raw);
                setUser(currentUser);
                const q = query(
                    collection(db, 'notifications'),
                    where('to', '==', currentUser.email)
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                }));
                setNotifications(list);
            }
        };
        load();
    }, []);

    const handleNotificationPress = async (item: any) => {
        if (item.link) {
            router.push('/pastor?tab=teams');
        }

        // 👇 약간 delay 후 삭제
        setTimeout(async () => {
            try {
                await deleteDoc(doc(db, 'notifications', item.id));
                setNotifications(prev => prev.filter(n => n.id !== item.id));
            } catch (e) {
                console.error('알림 삭제 실패:', e);
            }
        }, 500); // 0.5초 후 삭제
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📢 알림</Text>
            <FlatList
                data={notifications.sort(
                    (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleNotificationPress(item)}
                        style={styles.item}
                    >
                        <Text style={styles.message}>{item.message}</Text>
                        {item.createdAt?.seconds && (
                            <Text style={styles.date}>
                                {format(
                                    new Date(item.createdAt.seconds * 1000),
                                    'yyyy-MM-dd HH:mm'
                                )}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', marginTop: 20 }}>
                        알림이 없습니다.
                    </Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    item: {
        backgroundColor: '#f3f4f6',
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
    },
    message: { fontSize: 16, marginBottom: 4 },
    date: { fontSize: 12, color: '#888' },
});
