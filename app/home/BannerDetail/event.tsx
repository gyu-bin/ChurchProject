import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

export default function EventDetailPage() {
    const { id } = useLocalSearchParams();
    const { colors, spacing, font } = useDesign();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            const ref = doc(db, 'notice', id as string);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setEvent(snap.data());
            }
        };
        fetchEvent();
    }, [id]);

    const formatDate = (seconds: number) => {
        const date = new Date(seconds * 1000);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        });
    };

    if (!event) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                }}
            >
                <Text style={{ color: colors.subtext }}>불러오는 중...</Text>
            </View>
        );
    }

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top,
            }}
        >
            {/* 헤더 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: spacing.lg,
                    paddingHorizontal: spacing.md,
                }}
            >
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, width: 40 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: font.heading,
                            fontWeight: 'bold',
                            color: colors.text,
                        }}
                    >
                        {event.title}
                    </Text>
                </View>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
                {/* 배너 이미지 */}
                {event.bannerImage && (
                    <Image
                        source={{ uri: event.bannerImage }}
                        style={{
                            width: '100%',
                            height: 500,
                            justifyContent: 'flex-end',
                            backgroundColor: 'lightgray'
                        }}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                )}

                {/* 본문 내용 */}
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                    {/* 기간 */}
                    {event.startDate?.seconds && event.endDate?.seconds && (
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                marginBottom: 8,
                            }}
                        >
                            🗓 {formatDate(event.startDate.seconds)} ~ {formatDate(event.endDate.seconds)}
                        </Text>
                    )}

                    {/* 제목 */}
                    <Text
                        style={{
                            fontSize: font.heading,
                            fontWeight: 'bold',
                            color: colors.text,
                            marginBottom: 12,
                        }}
                    >
                        {event.title}
                    </Text>

                    {/* 내용 */}
                    <Text
                        style={{
                            fontSize: font.body,
                            color: colors.text,
                            lineHeight: 24,
                        }}
                    >
                        {event.content}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
