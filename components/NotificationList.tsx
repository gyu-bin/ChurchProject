// components/NotificationList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function NotificationList({ userEmail }: { userEmail: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, 'notifications'),
            where('recipient', '==', userEmail),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setNotifications(list);
        });

        return unsubscribe;
    }, [userEmail]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📬 알림</Text>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Text style={styles.item}>• {item.message}</Text>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 20 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    item: { fontSize: 15, marginBottom: 8 },
});
