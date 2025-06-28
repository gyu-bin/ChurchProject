import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import { useDesign } from '@/context/DesignSystem';

export default function AllEventsScreen() {
    const { colors, spacing, font } = useDesign();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'notice'), where('type', '==', 'event'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            const sorted = list.sort((a:any, b:any) => (a.startDate?.seconds || 0) - (b.startDate?.seconds || 0));
            setEvents(sorted);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const start = dayjs(item.startDate?.seconds * 1000).format('YYYY-MM-DD');
        const end = dayjs(item.endDate?.seconds * 1000).format('YYYY-MM-DD');
        const dateRange = start === end ? start : `${start} ~ ${end}`;

        return (
            <View style={styles.eventContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{dateRange}</Text>
                {item.place && <Text style={styles.place}>장소: {item.place}</Text>}
                {item.campus && <Text style={styles.meta}>캠퍼스: {item.campus}</Text>}
                {item.division && <Text style={styles.meta}>부서: {item.division}</Text>}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {events.length === 0 ? (
                <Text style={styles.noData}>등록된 일정이 없습니다.</Text>
            ) : (
                <FlatList
                    data={events}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: spacing.md }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    eventContainer: {
        marginBottom: 20,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f7f7f7',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    date: {
        fontSize: 14,
        color: '#333',
    },
    place: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    meta: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    noData: {
        padding: 24,
        fontSize: 16,
        textAlign: 'center',
        color: '#999',
    },
});
