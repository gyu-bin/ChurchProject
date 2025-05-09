import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useRouter } from 'expo-router';
import SkeletonBox from '@/components/Skeleton';
import { useDesign } from '@/context/DesignSystem';
import { StyleSheet } from 'react-native';

export default function TeamsScreen() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGrid, setIsGrid] = useState(true);
    const router = useRouter();
    const { colors, font, spacing, radius } = useDesign();

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
        const members = item.members ?? 0;
        const max = item.maxMembers ?? null;
        const isFull = typeof max === 'number' && members >= max;

        return (
            <TouchableOpacity
                style={isGrid ? [styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }] : [styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handlePress(item.id)}
                disabled={isFull}
            >
                <View style={styles.textContainer}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: colors.subtext }]}>👤 모임장: {item.leader}</Text>
                    <Text
                        style={[
                            styles.meta,
                            item.membersList?.length >= item.maxMembers && styles.fullText,
                            { color: item.membersList?.length >= item.maxMembers ? colors.error : colors.subtext }
                        ]}
                    >
                        👥 인원: {item.membersList?.length ?? 0} / {item.maxMembers ?? '명'}
                        {item.membersList?.length >= item.maxMembers ? ' (모집마감)' : ''}
                    </Text>
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>📋 소그룹 목록</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.push('/teams/create')}>
                        <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={24} color={colors.subtext} />
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
                    key={isGrid ? 'grid' : 'list'}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    listContent: {
        alignItems: 'center',
        paddingBottom: 60,
        width: '100%',
    },
    gridItem: {
        width: (screenWidth - 60) / 2,
        borderRadius: 16,
        padding: 16,
        margin: 8,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
    },
    listItem: {
        width: screenWidth - 40,
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
    },
    textContainer: {
        flexShrink: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    meta: {
        fontSize: 14,
    },
    fullText: {
        fontWeight: 'bold',
    },
});
