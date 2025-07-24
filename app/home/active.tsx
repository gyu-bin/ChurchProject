import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import FlexibleCarousel from '../../components/FlexibleCarousel';
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

export default function ActiveSection() {
  const frame = useSafeAreaFrame();
  const { colors, spacing, font } = useDesign();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { data: allTeams = [], isLoading: loadingTeams } = useQuery<any[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'teams'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const { data: allPrayers = [], isLoading: loadingPrayers } = useQuery<any[]>({
    queryKey: ['prayer_requests'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'prayer_requests'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const todayStr = dayjs().format('YYYY-MM-DD');
  const validTeams = React.useMemo(() => {
    return allTeams.filter((team: any) => {
      const expirationDate = team.expirationDate?.seconds
        ? dayjs(team.expirationDate.seconds * 1000)
        : null;
      const dueDate = expirationDate ? expirationDate.format('YYYY-MM-DD') : null;
      return dueDate && dueDate >= todayStr;
    });
  }, [allTeams, todayStr]);

  const sortedTeams = React.useMemo(() => {
    return validTeams
      .filter((t: any) => t.category === '✨ 반짝소모임')
      .sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate))
      .slice(0, 9);
  }, [validTeams]);

  const shuffledPrayers = React.useMemo(() => {
    return [...allPrayers].sort(() => Math.random() - 0.5).slice(0, 99);
  }, [allPrayers]);

  const dummyImageUrls = [
    'https://i.pinimg.com/736x/e3/08/ee/e308eedf0ca6ecacbaae866f2abf81d0.jpg',
    'https://i.pinimg.com/736x/18/98/ba/1898bae9c43122c4ede54d1570fd9982.jpg',
    'https://i.pinimg.com/736x/e5/6b/51/e56b51f0052bcb20364000c4f10b88e3.jpg',
    'https://i.pinimg.com/736x/b6/50/48/b650489faca0b69e3f4681271a9adff2.jpg',
  ];

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
          width: frame.width * 0.75,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 4,
          elevation: 2,
          flexDirection: 'row',
          gap: spacing.md,
        }}>
        {team.thumbnail ? (
          <Image
            source={{ uri: team.thumbnail }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              backgroundColor: '#eee',
            }}
            contentFit='cover'
            cachePolicy='disk'
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
              }}>
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
                }}>
                마감임박
              </Text>
            )}
          </View>
          <Text
            style={{
              fontSize: font.body,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 2,
            }}>
            {team.name}
          </Text>
          <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
            📍 {team.location ?? '장소 미정'}
          </Text>
          <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 2 }}>
            {dayjs(team.dueDate).format('M월 D일')} 마감
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name='person-circle-outline' size={14} color={colors.subtext} />
            <Text style={{ fontSize: font.caption, color: colors.subtext }}>
              {team.leader} · {team.membersList?.length ?? 1}명 참여
            </Text>
          </View>
          {/*<View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
              gap: 10,
            }}>
            {dummyImageUrls.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{
                  width: (frame.width * 0.75 - spacing.md * 2 - spacing.sm * 2 - 8 * 2) / 4,
                  height: 50,
                  right: 80,
                  borderRadius: 6,
                  backgroundColor: 'black',
                }}
                contentFit='cover'
              />
            ))}
          </View>*/}
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
          backgroundColor: isUrgent
            ? isDark
              ? '#ffa2a2' // 🟢 다크모드용 긴급 배경
              : '#FFF5F5' // 🟢 라이트모드용 긴급 배경
            : colors.surface,
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
          width: frame.width * 0.75,
        }}>
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: font.body,
            color: isUrgent
              ? isDark
                ? '#fff' // 🟢 다크모드 긴급 텍스트 색상
                : colors.error
              : colors.text,
            marginBottom: 4,
          }}>
          {isUrgent ? '🔥 긴급 기도제목' : prayer.title}
        </Text>
        <Text
          style={{
            fontSize: font.body,
            color: isUrgent
              ? isDark
                ? '#fff' // 🟢 다크모드 긴급 텍스트 색상
                : colors.error
              : colors.text,
            marginBottom: 8,
          }}>
          {prayer.content.length > 20 ? `${prayer.content.slice(0, 20)}...` : prayer.content}
        </Text>
        <Text
          style={{
            fontSize: font.caption,
            color: colors.subtext,
            textAlign: 'right',
          }}>
          {prayer.anonymous === 'Y' ? '익명' : prayer.name}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity onPress={() => router.push('/teams?filter=✨ 반짝소모임')}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}>
            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>
              ✨ 반짝소모임
            </Text>
            <Ionicons name='chevron-forward' size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        {sortedTeams.length === 1 && renderTeamCard(sortedTeams[0])}
        {sortedTeams.length >= 2 && <FlexibleCarousel data={sortedTeams} renderItem={renderTeamCard} />}
      </View>

      <View>
        <TouchableOpacity onPress={() => router.push('/share/allPrayer')}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}>
            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>
              🙏 함께 기도해요
            </Text>
            <Ionicons name='chevron-forward' size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        {shuffledPrayers.length > 0 && <FlexibleCarousel data={shuffledPrayers} renderItem={renderPrayerCard} />}
      </View>
    </View>
  );
}
