import { useDesign } from '@/context/DesignSystem';
import { useEvents } from '@/hooks/useEvents';
import dayjs from 'dayjs';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function AllEventsScreen() {
    const { colors, spacing, font } = useDesign();
    const { data: events = [], isLoading, error } = useEvents();

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

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.noData}>로딩 중...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.noData}>데이터를 불러오는 중 오류가 발생했습니다.</Text>
            </View>
        );
    }

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
