import { useDesign } from '@/app/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ImageBackground,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventDetailPage() {
  const { id } = useLocalSearchParams();
  const { colors, spacing, radius, font } = useDesign();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const insets = useSafeAreaInsets();

  const eventBannerSample = [
    {
      id: 'summer-retreat-2025',
      title: '2025 여름 수련회 신청 오픈!',
      bannerImage: 'https://i.pinimg.com/736x/19/09/c8/1909c81247d7deb3c9b398d4c2c02f32.jpg',
      startDate: { seconds: 1751846400 }, // 2025-07-07
      endDate: { seconds: 1752364800 },   // 2025-07-12
      content: '올여름 수련회에 함께하세요! 찬양과 말씀, 교제와 회복의 시간이 기다리고 있습니다. 지금 신청하고 하나님의 은혜를 경험해보세요.',
    },
    {
      id: 'new-family-class',
      title: '앱 출시가 다가오고 있습니다.',
      bannerImage: 'https://i.pinimg.com/736x/9d/cb/65/9dcb6537520307c24d1cd945c30fbf5f.jpg',
      startDate: { seconds: 1750128000 }, // 2025-06-17
      endDate: { seconds: 1750732800 },   // 2025-06-24
      content: '출시날까지 모두 화이팅입니다. 잘되면 좋은것 아니겠습니다. 하하',
    },
    {
      id: 'bible-reading-challenge',
      title: '성경읽기',
      bannerImage: 'https://i.pinimg.com/736x/7a/5e/e2/7a5ee2a0ad179a65368b1f1a0d63a8c2.jpg',
      startDate: { seconds: 1750032000 }, // 2025-06-16
      endDate: { seconds: 1752624000 },   // 2025-07-16
      content: '성경을 읽는것은 나의 삶에 중요한 일입니다. 모두 함께 읽도록 하죠',
    },
    {
      id: 'church-running-campain',
      title: '시광마라톤대회',
      bannerImage: '',
      startDate: { seconds: 1750032000 }, // 2025-06-16
      endDate: { seconds: 1752624000 },   // 2025-07-16
      content: '인간은 달리기위해 태어났죠. 열심히 달려봅시다 모두',
    }
  ];

  //샘플
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;

      // 🔍 1. 샘플 데이터에서 먼저 검색
      const sampleEvent = eventBannerSample.find(e => e.id === id);
      if (sampleEvent) {
        setEvent(sampleEvent);
        return;
      }

      // 🔁 2. 없을 경우 Firestore에서 가져오기
      const ref = doc(db, 'notice', id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setEvent(snap.data());
      }
    };

    fetchEvent();
  }, [id]);
  /*useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const ref = doc(db, 'notice', id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setEvent(snap.data());
      }
    };
    fetchEvent();
  }, [id]);*/

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
      <ScrollView
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top,
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, width: 40 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
              {event.title}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* 내용 */}
        {event.bannerImage ? (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <ImageBackground
                  source={{ uri: event.bannerImage }}
                  style={{ width: '100%', height: 280 }}
                  resizeMode="cover"
              >
                <View style={{ padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  {/* 기간 */}
                  {event.startDate?.seconds && event.endDate?.seconds && (
                      <Text style={{ fontSize: font.caption, color: '#fff', marginBottom: 8 }}>
                        🗓 {formatDate(event.startDate.seconds)} ~ {formatDate(event.endDate.seconds)}
                      </Text>
                  )}
                  {/* 제목 */}
                  <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: '#fff', marginBottom: 12 }}>
                    {event.title}
                  </Text>
                  {/* 내용 */}
                  <Text style={{ fontSize: font.body, color: '#fff', lineHeight: 24 }}>
                    {event.content}
                  </Text>
                </View>
              </ImageBackground>
            </View>
        ) : (
            <View style={{ paddingHorizontal: spacing.lg }}>
              {/* 기간 */}
              {event.startDate?.seconds && event.endDate?.seconds && (
                  <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 8 }}>
                    🗓 {formatDate(event.startDate.seconds)} ~ {formatDate(event.endDate.seconds)}
                  </Text>
              )}
              {/* 제목 */}
              <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
                {event.title}
              </Text>
              {/* 내용 */}
              <Text style={{ fontSize: font.body, color: colors.text, lineHeight: 24 }}>
                {event.content}
              </Text>
            </View>
        )}
      </ScrollView>
);
}
