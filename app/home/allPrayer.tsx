import { useDesign } from '@/app/context/DesignSystem';
import { useAppTheme } from '@/app/context/ThemeContext';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrayerItem {
    id: string;
    title: string;
    content: string;
    name?: string;
    email?: string;
    createdAt?: {
        toDate?: () => Date;
    };
}

interface Props {
    visible: boolean;
    prayers: PrayerItem[];
    currentUser: { email: string };
    onClose: () => void;
    onDelete: (id: string) => void;
    onRefresh?: () => Promise<void>; // 🔄 외부 새로고침 함수
}

export default function PrayerListModal({
                                            visible,
                                            prayers,
                                            currentUser,
                                            onClose,
                                            onDelete,
                                            onRefresh,
                                        }: Props) {
    const { mode } = useAppTheme();
    const theme = useDesign();
    const screenWidth = Dimensions.get('window').width;
    const insets = useSafeAreaInsets();
    const [localPrayers, setLocalPrayers] = useState<PrayerItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        setLocalPrayers(prayers);
    }, [prayers]);

    const handleDelete = (id: string) => {
        onDelete(id);
        setLocalPrayers(prev => prev.filter(p => p.id !== id));
    };

    const handleRefresh = async () => {
        if (!onRefresh) return;
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    };

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background}}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text,
                    marginBottom: 24, paddingTop: Platform.OS === 'android' ? insets.top : 20,
                    paddingHorizontal: 20
                }}>
                    📃 전체 기도제목
                </Text>

                <FlatList
                    data={[...localPrayers].sort((a, b) =>
                        (b.createdAt?.toDate?.()?.getTime?.() || 0) -
                        (a.createdAt?.toDate?.()?.getTime?.() || 0)
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={theme.colors.primary}
                        />
                    }
                    renderItem={({ item }) => (
                        <View style={{
                            backgroundColor: theme.colors.surface,
                            borderRadius: 16,
                            paddingVertical: 20,
                            paddingHorizontal: 24,
                            marginBottom: 20,
                            width: screenWidth > 600 ? 500 : screenWidth * 0.9,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.1,
                            shadowRadius: 6,
                            elevation: 4,
                            alignSelf: 'center',
                        }}>
                            <Text style={{
                                fontSize: 17,
                                fontWeight: '600',
                                color: theme.colors.primary,
                                marginBottom: 8,
                            }}>
                                🙏 {item.title}
                            </Text>

                            <Text style={{
                                fontSize: 15,
                                color: theme.colors.text,
                                marginBottom: 10,
                                lineHeight: 22,
                            }}>
                                {item.content}
                            </Text>

                            <Text style={{
                                fontSize: 13,
                                color: theme.colors.subtext,
                                textAlign: 'right',
                            }}>
                                - {item.name ?? '익명'}
                            </Text>

                            {currentUser?.email && item.email === currentUser.email && (
                                <TouchableOpacity
                                    onPress={() => handleDelete(item.id)}
                                    style={{
                                        marginTop: 16,
                                        backgroundColor: '#EF4444',
                                        paddingVertical: 10,
                                        borderRadius: 999,
                                        alignItems: 'center',
                                        shadowColor: '#000',
                                        shadowOpacity: 0.1,
                                        shadowRadius: 3,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>삭제</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                />

                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        alignItems: 'center',
                        marginTop: 20,
                        backgroundColor: theme.colors.border,
                        padding: 14,
                        borderRadius: 12
                    }}
                >
                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>닫기</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
}
