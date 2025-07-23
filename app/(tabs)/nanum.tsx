import SettingCard from '@/components/my/SettingCard';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { showToast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

type Prayer = {
  id: string;
  title: string;
  content: string;
  name: string;
  visibility: 'all' | 'pastor';
  createdAt?: {
    toDate: () => Date;
  };
};

export default function NanumPage() {
  const router = useRouter();
  const { mode } = useAppTheme();
  const theme = useDesign();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'pastor'>('all');
  const [prayers, setPrayers] = useState<any[]>([]);
  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [videoData, setVideoData] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  const [listKey, setListKey] = useState(Date.now());
  const flatListRef = useRef<FlatList>(null);
  const mainListRef = useRef<FlatList>(null);

  const frame = useSafeAreaFrame();
  const SIDE_MARGIN = 16;
  const ITEM_WIDTH = frame.width - SIDE_MARGIN * 2;
  const SIDE_SPACING = (frame.width - ITEM_WIDTH) / 2;

  useEffect(() => {
    setScrollCallback('nanum', () => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) {
        const userData = JSON.parse(raw);
        setCurrentUser(userData);
        setUser(userData);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      const snapshot = await getDocs(collection(db, 'videos'));
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const url = raw.url;
        const match = url.match(/v=([^&]+)/);
        const id = match ? match[1] : '';
        return {
          id: doc.id,
          videoId: id,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          url,
          order: raw.order ?? 0,
        };
      });
      const sorted = data.sort((a, b) => a.order - b.order);
      const withDummy =
        sorted.length >= 2
          ? [
              { ...sorted[sorted.length - 1], id: `left-${sorted[sorted.length - 1].id}` },
              ...sorted,
              { ...sorted[0], id: `right-${sorted[0].id}` },
            ]
          : [...sorted];
      setVideoData(withDummy);
    };
    fetchVideos();
  }, []);

  useEffect(() => {
    if (videoData.length > 2) {
      const random = Math.floor(Math.random() * (videoData.length - 2));
      setInitialIndex(random + 1);
      setCurrentIndex(random + 1);
    }
    fetchPrayers();
  }, [videoData]);

  const scrollToIndex = (index: number, animated = true) => {
    flatListRef.current?.scrollToIndex({ index, animated });
  };
  const handleScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    if (index === 0) {
      scrollToIndex(videoData.length - 2, false);
      setCurrentIndex(videoData.length - 2);
    } else if (index === videoData.length - 1) {
      scrollToIndex(1, false);
      setCurrentIndex(1);
    } else {
      setCurrentIndex(index);
      scrollToIndex(index, true);
    }
  };
  const goToNext = () => scrollToIndex(currentIndex + 1);
  const goToPrev = () => scrollToIndex(currentIndex - 1);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) {
        const userData = JSON.parse(raw);
        setCurrentUser(userData);
        setUser(userData);
      }
    };
    loadUser();
  }, []);

  const fetchPrayers = async () => {
    const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
    const snapshot = await getDocs(q);
    const list: Prayer[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Prayer, 'id'>),
    }));
    list.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() ?? new Date(0);
      const bDate = b.createdAt?.toDate?.() ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    setPrayers(list);
  };

  const fetchPublicPrayers = async () => {
    const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
    const snapshot = await getDocs(q);
    setPublicPrayers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setViewModalVisible(true);
  };

  const submitPrayer = async () => {
    if (!title || !content) {
      Alert.alert('모든 항목을 작성해주세요');
      return;
    }
    try {
      await addDoc(collection(db, 'prayer_requests'), {
        name: user?.name || '익명',
        title,
        content,
        email: currentUser?.email,
        visibility,
        createdAt: new Date(),
      });
      showToast('🙏 기도제목이 제출되었습니다.');
      setModalVisible(false);
      setTitle('');
      setContent('');
      setVisibility('all');
      fetchPrayers();
      router.replace('/nanum');
    } catch (err: any) {
      Alert.alert('제출 실패', err.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ref={mainListRef}
        ListHeaderComponent={
          <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#2563eb', marginBottom: 24 }}>
              나눔
            </Text>
            {/* 추천 설교 */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                  paddingLeft: '3%',
                  paddingTop: '3%',
                }}>
                📺 추천 설교
              </Text>
              <View style={{ position: 'relative', paddingTop: '3%', paddingBottom: '2%' }}>
                {initialIndex !== null && (
                  <FlatList
                    key={listKey}
                    ref={flatListRef}
                    data={videoData}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    decelerationRate='fast'
                    snapToInterval={ITEM_WIDTH}
                    getItemLayout={(data, index) => ({
                      length: ITEM_WIDTH,
                      offset: ITEM_WIDTH * index,
                      index,
                    })}
                    contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScrollEnd}
                    renderItem={({ item }) => (
                      <View style={{ width: ITEM_WIDTH }}>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              '🎥 유튜브로 이동',
                              '해당 영상을 유튜브에서 시청하시겠습니까?',
                              [
                                { text: '❌ 취소', style: 'cancel' },
                                {
                                  text: '✅ 확인',
                                  onPress: () => Linking.openURL(item.url),
                                  style: 'default',
                                },
                              ],
                              { cancelable: true }
                            );
                          }}>
                          <Image
                            source={{ uri: item.thumbnail }}
                            style={{
                              width: '92%',
                              aspectRatio: 16 / 9,
                              borderRadius: 14,
                              backgroundColor: '#ccc',
                            }}
                            resizeMode='cover'
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
                {/* 좌우 버튼 */}
                <TouchableOpacity
                  onPress={goToPrev}
                  style={{
                    position: 'absolute',
                    top: '40%',
                    left: 4,
                    zIndex: 10,
                    backgroundColor: '#00000055',
                    padding: 8,
                    borderRadius: 20,
                  }}>
                  <Ionicons name='chevron-back' size={15} color='#fff' />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={goToNext}
                  style={{
                    position: 'absolute',
                    top: '40%',
                    right: 4,
                    zIndex: 10,
                    backgroundColor: '#00000055',
                    padding: 8,
                    borderRadius: 20,
                  }}>
                  <Ionicons name='chevron-forward' size={15} color='#fff' />
                </TouchableOpacity>
              </View>
              {/* 🔘 인디케이터 */}
              {videoData.length > 2 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginTop: 6,
                    marginBottom: 8,
                  }}>
                  {videoData.slice(1, videoData.length - 1).map((_, i) => {
                    const isActive = i + 1 === currentIndex;
                    return (
                      <View
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          marginHorizontal: 4,
                          backgroundColor: isActive ? theme.colors.primary : theme.colors.border,
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </View>
            {/* 기도제목 */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 3,
              }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                🙏 기도제목
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/share/prayerModal')}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  🙏 기도제목 나누기
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/share/allPrayer')}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  📃 기도제목 보기
                </Text>
              </TouchableOpacity>
            </View>
            {/* 매일묵상 */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 3,
              }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                📖 매일묵상
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/share/DailyBible')}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  📖 매일묵상 나누기
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 3,
              }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                😍 감사나눔
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/share/thank')}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>😍 감사나눔</Text>
              </TouchableOpacity>
            </View>

            {/* <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>🌲 대나무숲</Text>
                            <TouchableOpacity onPress={()=>router.push('/share/forest')} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🌲 대나무숲</Text>
                            </TouchableOpacity>
                        </View>*/}

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 3,
              }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                📝 설교나눔/질문
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/share/SermonTabs')}
                style={{
                  backgroundColor: theme.colors.primary,
                  padding: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  📝 설교나눔/질문
                </Text>
              </TouchableOpacity>
            </View>

            <SettingCard
              title='성능테스트'
              icon={{
                name: 'chatbox-outline',
                color: '#7c3aed',
                backgroundColor: '#ddd6fe',
              }}
              onPress={() => router.push('/myPage/PerformanceTestScreen')}
            />
          </View>
        }
        data={prayers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPrayers} />}
        renderItem={() => <View />}
      />
    </SafeAreaView>
  );
}
