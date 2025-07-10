import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { showToast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrayerItem {
  id: string;
  title: string;
  content: string;
  name?: string;
  email?: string;
  createdAt?: {
    toDate?: () => Date;
  };
  anonymous?: 'Y' | 'N';
  urgent?: 'Y' | 'N';
}

const PAGE_SIZE = 7;

export default function PrayerListScreen() {
  const { mode } = useAppTheme();
  const theme = useDesign();
  const frame = useSafeAreaFrame();
  const screenWidth = frame.width;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const isDark = mode === 'dark';

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) {
        const userData = JSON.parse(raw);
        setCurrentUser(userData);
      }
    };
    loadUser();
    fetchInitialPrayers();
  }, []);

  const fetchInitialPrayers = async () => {
    setLoading(true);
    const q = query(
      collection(db, 'prayer_requests'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const snapshot = await getDocs(q);
    const data: PrayerItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<PrayerItem, 'id'>),
    }));
    setPrayers(data);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLoading(false);
  };

  const fetchMorePrayers = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const q = query(
      collection(db, 'prayer_requests'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
    const snapshot = await getDocs(q);
    const data: PrayerItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<PrayerItem, 'id'>),
    }));

    setPrayers((prev) => [...prev, ...data]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prayer_requests', id));
      setPrayers((prev) => prev.filter((p) => p.id !== id));
      showToast('🙏 기도제목이 삭제되었습니다.');
    } catch (error) {
      console.error('🔥 기도제목 삭제 실패:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialPrayers();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: PrayerItem }) => {
    const isUrgent = item.urgent === 'Y';

    return (
      <View
        style={{
          backgroundColor: isUrgent ? (isDark ? '#7F1D1D' : '#FEF2F2') : theme.colors.surface,
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
          borderWidth: isUrgent ? 1.5 : 0,
          borderColor: isUrgent ? '#DC2626' : 'transparent',
        }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: isUrgent ? (isDark ? '#F87171' : '#DC2626') : theme.colors.primary,
            marginBottom: 8,
          }}>
          {isUrgent ? `🔥 ${item.title}` : `🙏 ${item.title}`}
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: theme.colors.text,
            marginBottom: 10,
            lineHeight: 22,
          }}>
          {item.content}
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text,
            textAlign: 'right',
          }}>
          - {item.anonymous === 'Y' ? '익명' : item.name}
        </Text>

        {currentUser?.email === item.email && (
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
            }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>삭제</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0,
      }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          height: 50,
        }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name='arrow-back' size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            textAlign: 'center',
            flex: 1,
            paddingLeft: '5%',
          }}>
          📃 전체 기도제목
        </Text>
        <TouchableOpacity onPress={() => router.push('/share/prayerModal')} style={{ padding: 8 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 16 }}>🙏 나누기</Text>
        </TouchableOpacity>
      </View>

      {/* 무한 스크롤 리스트 */}
      <OptimizedFlatList
        data={prayers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={fetchMorePrayers}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        removeClippedSubviews={true}
        initialNumToRender={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}
