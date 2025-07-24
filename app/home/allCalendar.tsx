import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import { collection, DocumentData, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter, where } from 'firebase/firestore';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-root-toast';

export default function AllEventsScreen() {
    const { colors, spacing, font } = useDesign();
    const [events, setEvents] = React.useState<any[]>([]);
    const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [hasMore, setHasMore] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    // 최초 10개 불러오기
    React.useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'notice'),
                    where('type', '==', 'event'),
                    orderBy('startDate', 'asc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setEvents(list);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
                setHasMore(snapshot.docs.length === 10);
            } catch (e) {
                Toast.show('행사/이벤트를 불러오지 못했습니다. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, []);

    // 추가 데이터 불러오기
    const fetchMore = async () => {
        if (loading || !hasMore || !lastVisible) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'notice'),
                where('type', '==', 'event'),
                orderBy('startDate', 'asc'),
                startAfter(lastVisible),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setEvents((prev) => [...prev, ...list]);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || lastVisible);
            setHasMore(snapshot.docs.length === 10);
        } catch (e) {
            Toast.show('행사/이벤트 추가 로딩 실패. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
        } finally {
            setLoading(false);
        }
    };

    // 새로고침
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const q = query(
                collection(db, 'notice'),
                where('type', '==', 'event'),
                orderBy('startDate', 'asc'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setEvents(list);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === 10);
        } catch (e) {
            Toast.show('행사/이벤트 새로고침 실패. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
        } finally {
            setRefreshing(false);
        }
    };

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

    if (loading && events.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noData}>로딩 중...</Text>
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
                    keyExtractor={item => item.id?.toString?.() || String(item.id)}
                    contentContainerStyle={{ padding: spacing.md }}
                    onEndReached={fetchMore}
                    onEndReachedThreshold={0.2}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ListFooterComponent={loading ? <Text style={styles.noData}>불러오는 중...</Text> : null}
                    ListEmptyComponent={<Text style={styles.noData}>{loading ? '' : '등록된 일정이 없습니다.'}</Text>}
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
