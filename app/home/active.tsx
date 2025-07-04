import { db } from '@/firebase/config';
import { router } from "expo-router";
import { collection, deleteDoc, doc, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useDesign } from '@/context/DesignSystem';
import FlexibleCarousel from '../../components/FlexibleCarousel';
import { Image } from 'expo-image';
import dayjs from "dayjs";
import { useRealtimeCollection } from '@/hooks/useRealtimeCollection';

interface Team {
    id: string;
    name: string;
    dueDate: string;
    membersList: any[];
    maxMembers: number;
    category: string;
    leader: string;
    location?: string;
    thumbnail?: string;
    expirationDate?: any;
}

interface PrayerRequest {
    id: string;
    title: string;
    content: string;
    name: string;
    createdAt: any;
    anonymous: any;
    urgent: any;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
console.log(SCREEN_WIDTH);

export default function ActiveSection() {
    const { colors, spacing, font } = useDesign();
    const { data: allTeams } = useRealtimeCollection('teams');
    const { data: allPrayers } = useRealtimeCollection('prayer_requests');

    const [teams, setTeams] = useState<Team[]>([]);
    const [prayers, setPrayers] = useState<PrayerRequest[]>([]);

    const dummyImageUrls = [
        'https://i.pinimg.com/736x/e3/08/ee/e308eedf0ca6ecacbaae866f2abf81d0.jpg',
        'https://i.pinimg.com/736x/18/98/ba/1898bae9c43122c4ede54d1570fd9982.jpg',
        'https://i.pinimg.com/736x/e5/6b/51/e56b51f0052bcb20364000c4f10b88e3.jpg',
        'https://i.pinimg.com/736x/b6/50/48/b650489faca0b69e3f4681271a9adff2.jpg'
    ];

    useEffect(() => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const validTeams: Team[] = [];

        allTeams.forEach((team: any) => {
            const expirationDate = team.expirationDate?.seconds
                ? dayjs(team.expirationDate.seconds * 1000)
                : null;

            const dueDate = expirationDate ? expirationDate.format('YYYY-MM-DD') : null;

            if (dueDate && dueDate >= todayStr) {
                validTeams.push({ ...team, dueDate });
            } else if (dueDate && dueDate < todayStr) {
                // 🗑️ 만료된 팀은 삭제 처리
                deleteDoc(doc(db, 'teams', team.id)).catch((e) =>
                    console.error(`팀 삭제 실패 (${team.id}):`, e)
                );
            }
        });

        const sortedTeams = validTeams
            .filter((t) => t.category === '✨ 반짝소모임')
            .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
            .slice(0, 9);

        setTeams(sortedTeams);

        const sortedPrayers = allPrayers
            .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
            .slice(0, 99);

        setPrayers(sortedPrayers);
    }, [allTeams, allPrayers]);

    const getDDay = (dueDate: string) => {
        const today = dayjs().startOf('day');
        const end = dayjs(dueDate).startOf('day');
        const diff = end.diff(today, 'day');
        if (diff === 0) return 'D-Day';
        if (diff < 0) return '마감';
        return `D-${diff}`;
    };

    const renderTeamCard = (team: Team) => {
        const dDay = getDDay(team.dueDate);
        const isUrgent = dDay.startsWith('D-') && parseInt(dDay.replace('D-', '')) <= 3;

        return (
            <TouchableOpacity
                key={team.id}
                onPress={() => router.push(`/teams/${team.id}`)}
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.xs,
                    marginTop: spacing.xs,
                    marginLeft: spacing.xs,
                    width: SCREEN_WIDTH * 0.75,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                    flexDirection: 'row',
                    gap: spacing.md,
                }}
            >
                {team.thumbnail ? (
                    <Image
                        source={{ uri: team.thumbnail }}
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                        }}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                ) : (
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                        }}
                    />
                )}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                backgroundColor: '#e0e0e0',
                                paddingHorizontal: 6,
                                borderRadius: 4,
                            }}
                        >
                            {team.category?.replace('✨ ', '')}
                        </Text>
                        {isUrgent && (
                            <Text
                                style={{
                                    fontSize: font.caption,
                                    color: '#C08400',
                                    backgroundColor: '#FFF7DB',
                                    paddingHorizontal: 6,
                                    borderRadius: 4,
                                }}
                            >
                                마감임박
                            </Text>
                        )}
                    </View>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text, marginBottom: 2 }}>
                        {team.name}
                    </Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
                        📍 {team.location ?? '장소 미정'}
                    </Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
                        {dayjs(team.dueDate).format('M월 D일')} 마감
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.subtext} />
                        <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                            {team.leader} · {team.membersList?.length ?? 1}명 참여
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
                        {dummyImageUrls.map((uri, index) => (
                            <Image
                                key={index}
                                source={{ uri }}
                                style={{
                                    width: (SCREEN_WIDTH * 0.75 - spacing.md * 2 - spacing.sm * 2 - 8 * 2) / 4,
                                    height: 50,
                                    right: 80,
                                    borderRadius: 6,
                                    backgroundColor: 'black',
                                }}
                                contentFit="cover"
                            />
                        ))}
                    </View>
                </View>

                <View style={{ position: 'absolute', right: 50, top: 12 }}>
                    <Text style={{ fontWeight: 'bold', color: colors.primary }}>{dDay}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderPrayerCard = (prayer: PrayerRequest) => {
        const isUrgent = prayer.urgent === 'Y';

        return (
            <View
                key={prayer.id}
                style={{
                    backgroundColor: isUrgent ? '#FFF5F5' : colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.xs,
                    marginTop: spacing.xs,
                    marginLeft: spacing.xs,
                    borderWidth: 2,
                    borderColor: isUrgent ? colors.error : colors.border,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 5,
                    width: SCREEN_WIDTH * 0.75,
                }}
            >
                <Text
                    style={{
                        fontWeight: 'bold',
                        fontSize: font.body,
                        color: isUrgent ? colors.error : colors.text,
                        marginBottom: 4,
                    }}
                >
                    {isUrgent ? '🔥 긴급 기도제목' : prayer.title}
                </Text>
                <Text
                    style={{
                        fontSize: font.body,
                        color: colors.text,
                        marginBottom: 8,
                    }}
                >
                    {prayer.content.length > 20
                        ? `${prayer.content.slice(0, 20)}...`
                        : prayer.content}
                </Text>
                <Text
                    style={{
                        fontSize: font.caption,
                        color: colors.subtext,
                        textAlign: 'right',
                    }}
                >
                    {prayer.anonymous === 'Y' ? '익명' : prayer.name}
                </Text>
            </View>
        );
    };

    return (
        <View style={{ gap: spacing.lg }}>
            <View style={{ marginBottom: spacing.lg }}>
                <TouchableOpacity onPress={() => router.push('/teams?filter=✨ 반짝소모임')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>✨ 반짝소모임</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                    </View>
                </TouchableOpacity>
                {teams.length === 1 && renderTeamCard(teams[0])}
                {teams.length >= 2 && (
                    <FlexibleCarousel data={teams} renderItem={renderTeamCard} />
                )}
            </View>

            <View>
                <TouchableOpacity onPress={() => router.push('/share/allPrayer')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>🙏 함께 기도해요</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                    </View>
                </TouchableOpacity>
                {prayers.length > 0 && (
                    <FlexibleCarousel data={prayers} renderItem={renderPrayerCard} />
                )}
            </View>
        </View>
    );
}
/*
import { db } from '@/firebase/config';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    where,
} from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import FlexibleCarousel from '../../components/FlexibleCarousel';
import { Image } from 'expo-image';
import { useRealtimeCollection } from '@/hooks/useRealtimeCollection';

interface Team {
    id: string;
    name: string;
    dueDate: string;
    membersList: any[];
    maxMembers: number;
    category: string;
    leader: string;
    location?: string;
    thumbnail?: string;
}

interface PrayerRequest {
    id: string;
    title: string;
    content: string;
    name: string;
    createdAt: any;
    anonymous: any;
    urgent: any;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ActiveSection() {
    const { colors, spacing, font } = useDesign();
    const [teams, setTeams] = useState<Team[]>([]);
    const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
    const sparkleTeams = teams.filter((team) => team.category === '✨ 반짝소모임');

    const dummyImageUrls = [
        'https://i.pinimg.com/736x/e3/08/ee/e308eedf0ca6ecacbaae866f2abf81d0.jpg',
        'https://i.pinimg.com/736x/18/98/ba/1898bae9c43122c4ede54d1570fd9982.jpg',
        'https://i.pinimg.com/736x/e5/6b/51/e56b51f0052bcb20364000c4f10b88e3.jpg',
        'https://i.pinimg.com/736x/b6/50/48/b650489faca0b69e3f4681271a9adff2.jpg'
    ];

    useFocusEffect(
        useCallback(() => {
            const fetchTeams = async () => {
                const q = query(collection(db, 'teams'), where('category', '==', '✨ 반짝소모임'));
                const snap = await getDocs(q);

                const todayStr = dayjs().format('YYYY-MM-DD');
                const validTeams: Team[] = [];

                for (const docSnap of snap.docs) {
                    const raw = docSnap.data() as any;
                    const id = docSnap.id;

                    let expirationDate = raw.expirationDate;
                    if (expirationDate?.toDate) expirationDate = expirationDate.toDate();

                    const dueDate =
                        expirationDate instanceof Date && !isNaN(expirationDate as any)
                            ? dayjs(expirationDate).format('YYYY-MM-DD')
                            : null;

                    if (!dueDate) continue;

                    if (dueDate < todayStr) {
                        try {
                            await deleteDoc(doc(db, 'teams', id));
                        } catch (e) {
                            console.error(`삭제 실패 (${id}):`, e);
                        }
                        continue;
                    }

                    validTeams.push({
                        ...raw,
                        id,
                        dueDate,
                        members: raw.members ?? [],
                    });
                }

                const sorted = validTeams.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
                setTeams(sorted.slice(0, 9));
            };

            const fetchPrayers = async () => {
                const q = query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PrayerRequest));
                setPrayers(data.slice(0, 99));
            };

            fetchTeams();
            fetchPrayers();
        }, [])
    );

    const getDDay = (dueDate: string) => {
        const today = dayjs().startOf('day');
        const end = dayjs(dueDate).startOf('day');
        const diff = end.diff(today, 'day');
        if (diff === 0) return 'D-Day';
        if (diff < 0) return '마감';
        return `D-${diff}`;
    };

    const renderTeamCard = (team: Team) => {
        const dDay = getDDay(team.dueDate);
        const isUrgent = dDay.startsWith('D-') && parseInt(dDay.replace('D-', '')) <= 3;

        return (
            <TouchableOpacity
                key={team.id}
                onPress={() => router.push(`/teams/${team.id}`)}
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.xs,
                    marginTop: spacing.xs,
                    marginLeft: spacing.xs,
                    width: SCREEN_WIDTH * 0.75,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                    flexDirection: 'row',
                    gap: spacing.md,
                }}
            >
                {/!* ✅ 썸네일 이미지 렌더링 *!/}
                {team.thumbnail ? (
                    <Image
                        source={{ uri: team.thumbnail }}
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                        }}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                ) : (
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                        }}
                    />
                )}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                backgroundColor: '#e0e0e0',
                                paddingHorizontal: 6,
                                borderRadius: 4,
                            }}
                        >
                            {team.category?.replace('✨ ', '')}
                        </Text>
                        {isUrgent && (
                            <Text
                                style={{
                                    fontSize: font.caption,
                                    color: '#C08400',
                                    backgroundColor: '#FFF7DB',
                                    paddingHorizontal: 6,
                                    borderRadius: 4,
                                }}
                            >
                                마감임박
                            </Text>
                        )}
                    </View>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text, marginBottom: 2 }}>
                        {team.name}
                    </Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
                        📍 {team.location ?? '장소 미정'}
                    </Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
                        {dayjs(team.dueDate).format('M월 D일')} 마감
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.subtext} />
                        <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                            {team.leader} · {team.membersList?.length ?? 1}명 참여
                        </Text>
                    </View>
                    {/!* ✅ 하단 이미지 리스트 더미*!/}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between',marginTop: 12,gap: 10}}>
                        {dummyImageUrls.map((uri, index) => (
                            <Image
                                key={index}
                                source={{ uri }}
                                style={{
                                    width: (SCREEN_WIDTH * 0.75 - spacing.md * 2 - spacing.sm * 2 - 8 * 2) / 4, // 좌우 여백 보정
                                    height: 50,
                                    right: 80,
                                    borderRadius: 6,
                                    backgroundColor: 'blakc',
                                }}
                                contentFit="cover"
                            />
                        ))}
                    </View>
                </View>

                <View style={{ position: 'absolute', right: 50, top: 12 }}>
                    <Text style={{ fontWeight: 'bold', color: colors.primary }}>{dDay}</Text>
                </View>

                {/!* ✅ 하단 피드 이미지 영역 *!/}

            </TouchableOpacity>
        );
    }

    const renderPrayerCard = (prayer: PrayerRequest) => {
        const isUrgent = prayer.urgent === 'Y';

        return (
            <View
                key={prayer.id}
                style={{
                    backgroundColor: isUrgent ? '#FFF5F5' : colors.surface, // 연한 빨간 배경
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.xs,
                    marginTop: spacing.xs,
                    marginLeft: spacing.xs,
                    borderWidth: 2,
                    borderColor: isUrgent ? colors.error : colors.border, // 빨간 테두리
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 5,
                    width: SCREEN_WIDTH * 0.75,
                }}
            >
                {/!* 🔥 긴급 제목 강조 *!/}
                <Text
                    style={{
                        fontWeight: 'bold',
                        fontSize: font.body,
                        color: isUrgent ? colors.error : colors.text,
                        marginBottom: 4,
                    }}
                >
                    {isUrgent ? '🔥 긴급 기도제목' : prayer.title}
                </Text>

                {/!* 내용 *!/}
                <Text
                    style={{
                        fontSize: font.body,
                        color: colors.text,
                        marginBottom: 8,
                    }}
                >
                    {prayer.content.length > 20
                        ? `${prayer.content.slice(0, 20)}...`
                        : prayer.content}
                </Text>

                {/!* 작성자 *!/}
                <Text
                    style={{
                        fontSize: font.caption,
                        color: colors.subtext,
                        textAlign: 'right',
                    }}
                >
                    {prayer.anonymous === 'Y' ? '익명' : prayer.name}
                </Text>
            </View>
        );
    };

    return (
        <View style={{ gap: spacing.lg }}>
            <View style={{ marginBottom: spacing.lg }}>
                <TouchableOpacity onPress={() => router.push('/teams?filter=✨ 반짝소모임')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>✨ 반짝소모임</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                    </View>
                </TouchableOpacity>

                {sparkleTeams.length === 1 && renderTeamCard(sparkleTeams[0])}

                {sparkleTeams.length >= 2 && (
                    <FlexibleCarousel data={sparkleTeams} renderItem={renderTeamCard} />
                )}
            </View>

            <View>
                <TouchableOpacity onPress={() => router.push('/share/allPrayer')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>🙏 함께 기도해요</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                    </View>
                </TouchableOpacity>

                {prayers.length > 0 && (
                    <FlexibleCarousel data={prayers} renderItem={renderPrayerCard} />
                )}
            </View>
        </View>
    );
}
*/
