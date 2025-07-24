import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { useDeletePrayer } from '@/hooks/usePrayers';
import { showToast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { collection, DocumentData, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-root-toast';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

type Prayer = {
  id: string;
  title: string;
  content: string;
  name?: string;
  email?: string;
  createdAt?: { toDate?: () => Date } | string;
  anonymous?: 'Y' | 'N';
  urgent?: 'Y' | 'N';
};

export default function PrayerListScreen() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { mutateAsync: deletePrayer } = useDeletePrayer();

  const { mode } = useAppTheme();
  const theme = useDesign();
  const frame = useSafeAreaFrame();
  const screenWidth = frame.width;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
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
  }, []);

  // 최초 10개 불러오기
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'prayer_requests'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prayer));
        setPrayers(list);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === 10);
      } catch (e) {
        Toast.show('기도제목을 불러오지 못했습니다. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // 추가 데이터 불러오기
  const fetchMore = async () => {
    if (loading || !hasMore || !lastVisible) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'prayer_requests'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prayer));
      setPrayers((prev) => [...prev, ...list]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || lastVisible);
      setHasMore(snapshot.docs.length === 10);
    } catch (e) {
      Toast.show('기도제목 추가 로딩 실패. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePrayer(id);
      showToast('🙏 기도제목이 삭제되었습니다.');
      // refetch(); // usePrayers 대신 직접 쿼리를 사용하므로 refetch는 제거
      // 삭제 후 새로고침
      handleRefresh();
    } catch (error) {
      console.error('🔥 기도제목 삭제 실패:', error);
      Toast.show('❌ 삭제에 실패했습니다. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const q = query(
        collection(db, 'prayer_requests'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prayer));
      setPrayers(list);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 10);
    } catch (e) {
      Toast.show('기도제목 새로고침 실패. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Prayer }) => {
    const isUrgent = item.urgent === 'Y';
    const date =
      typeof item.createdAt === 'string'
        ? item.createdAt
        : item.createdAt?.toDate
          ? format(item.createdAt.toDate(), 'yyyy-MM-dd HH:mm')
          : '';

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
            fontSize: 12,
            color: theme.colors.subtext,
            textAlign: 'right',
          }}>
          {date} - {item.anonymous === 'Y' ? '익명' : item.name}
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

      {/* 리스트 */}
      <OptimizedFlatList
        data={prayers}
        keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ marginTop: 40 }}>
              <Text style={{ textAlign: 'center', color: theme.colors.subtext }}>
                등록된 기도제목이 없습니다.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={5}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.2}
      />
    </SafeAreaView>
  );
}
