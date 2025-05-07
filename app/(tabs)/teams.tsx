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
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useRouter } from 'expo-router';

export default function TeamsScreen() {
    const [teams, setTeams] = useState<any[]>([]);
    const [isGrid, setIsGrid] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, 'teams'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTeams(fetched);
        });
        return unsubscribe;
    }, []);

    const handlePress = (id: string) => {
        router.push(`/teams/${id}`);
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={isGrid ? styles.gridItem : styles.listItem}
            onPress={() => handlePress(item.id)}
        >
            <View style={styles.cardContent}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                    <Ionicons name="person-circle" size={16} /> 모임장: {item.leader}
                </Text>
                <Text style={styles.meta}>
                    <Ionicons name="people" size={16} /> 인원: {item.members ?? 1}명
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>소그룹 목록</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.push('/teams/create')}>
                        <Ionicons name="add-circle-outline" size={26} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <Ionicons name={isGrid ? 'list' : 'grid'} size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={teams}
                key={isGrid ? 'g' : 'l'}
                numColumns={isGrid ? 2 : 1}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    { justifyContent: 'center', alignItems: 'center' },
                ]}
                columnWrapperStyle={isGrid && { gap: 16 }}
            />
        </SafeAreaView>
    );
}

const screenWidth = Dimensions.get('window').width;
const gridItemWidth = (screenWidth - 60) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8', // 부드러운 파스텔톤 배경
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    actions: {
        flexDirection: 'row',
        gap: 14,
    },
    listContent: {
        paddingBottom: 24,
    },
    gridItem: {
        width: gridItemWidth,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 3,
    },
    listItem: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        gap: 8,
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    meta: {
        fontSize: 14,
        color: '#4b5563',
    },
});
