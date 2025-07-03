import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SermonShareWrite from './modal/SermonShareWrite'; // 작성 모달 컴포넌트

dayjs.extend(relativeTime);

export default function SermonSharePage() {
    const { colors, spacing, font, radius } = useDesign();
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false); // ✨ 상태 추가

    const insets = useSafeAreaInsets();
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, 'sermon_shares'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setShares(data);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: spacing.md }}>
            {loading ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                    keyboardShouldPersistTaps="handled"
                >
                    {shares.map((item) => (
                        <View
                            key={item.id}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 16,
                                marginBottom: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.text }}>
                                {item.title}
                            </Text>
                            <Text style={{ color: colors.subtext, marginBottom: spacing.xs }}>
                                {item.preacher} • {item.date}
                            </Text>
                            <Text style={{ color: colors.text, marginBottom: spacing.xs }}>
                                {item.content}
                            </Text>
                            <Text style={{ fontSize: font.caption, color: colors.subtext, textAlign: 'right' }}>
                                {dayjs(item.createdAt?.seconds * 1000).fromNow()}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* ➕ 플로팅 버튼 */}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 32,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 나눔</Text>
            </TouchableOpacity>

            {/* ✨ 작성 모달 */}
            <SermonShareWrite
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}
