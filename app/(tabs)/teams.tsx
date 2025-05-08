import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useRouter } from 'expo-router';
import SkeletonBox from '@/components/Skeleton';

export default function TeamsScreen() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGrid, setIsGrid] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, 'teams'), where('approved', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTeams(fetched);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handlePress = (id: string) => {
        router.push(`/teams/${id}`);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isFull = item.members >= item.capacity;
        return (
            <TouchableOpacity
                style={isGrid ? styles.gridItem : styles.listItem}
                onPress={() => handlePress(item.id)}
                disabled={isFull}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>👤 모임장: {item.leader}</Text>
                    <Text style={[styles.meta, isFull && { color: '#ef4444' }]}>👥 {item.members ?? 1} / {item.capacity}명 {isFull ? '(모집마감)' : ''}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSkeletons = () => (
        Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={isGrid ? styles.gridItem : styles.listItem}>
                <SkeletonBox height={18} width="70%" />
                <SkeletonBox height={16} width="50%" />
                <SkeletonBox height={16} width="40%" />
            </View>
        ))
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.toggleRow}>
                <Text style={styles.title}>소그룹 목록</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.push('/teams/create')}>
                        <Ionicons name="add-circle" size={24} color="#4287f5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <Ionicons name={isGrid ? 'list' : 'grid'} size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={{ flexDirection: isGrid ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
                    {renderSkeletons()}
                </View>
            ) : (
                <FlatList
                    data={teams}
                    key={isGrid ? 'g' : 'l'}
                    numColumns={isGrid ? 2 : 1}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={isGrid && { gap: 16 }}
                />
            )}
        </SafeAreaView>
    );
}

const screenWidth = Dimensions.get('window').width;
const gridItemWidth = (screenWidth - 60) / 2;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    listContent: { paddingBottom: 24 },
    gridItem: { width: gridItemWidth, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 16 },
    listItem: { flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', gap: 12 },
    textContainer: { flexShrink: 1 },
    name: { fontSize: 16, fontWeight: 'bold' },
    meta: { fontSize: 14, color: '#666' },
});
