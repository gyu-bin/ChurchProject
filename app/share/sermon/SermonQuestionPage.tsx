import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import dayjs from 'dayjs';
import SermonQuestionModal from './modal/SermonQuestionModal'; // ✨ 추가: 질문 작성 모달

export default function SermonQuestionPage() {
    const { colors } = useDesign();
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false); // ✨ 모달 상태 추가
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, 'sermon_questions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuestions(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => router.push(`/share/sermon/sermonQustionDeatil?id=${item.id as string}`)}
            style={{
                backgroundColor: colors.surface,
                padding: 16,
                marginBottom: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border
            }}
        >
            <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 16 }}>
                {item.content}
            </Text>
            <Text style={{ fontWeight: 'light', color: colors.text, fontSize: 16 }}>
                {item.author}
            </Text>
            <Text style={{ color: colors.subtext, marginTop: 4 }}>
                {item.createdAt?.seconds
                    ? dayjs(item.createdAt.seconds * 1000).format('YYYY-MM-DD HH:mm')
                    : '방금 전'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ✨ 플로팅 버튼 */}
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>❓ 질문</Text>
            </TouchableOpacity>

            {/* ✨ 질문 작성 모달 */}
            <SermonQuestionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}
