import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { useDeletePrayer, usePrayers } from '@/hooks/usePrayers';
import { showToast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

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
  const { data: prayers = [], isLoading, refetch } = usePrayers();
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

  const handleDelete = async (id: string) => {
    try {
      await deletePrayer(id);
      showToast('🙏 기도제목이 삭제되었습니다.');
      refetch();
    } catch (error) {
      console.error('🔥 기도제목 삭제 실패:', error);
      showToast('❌ 삭제에 실패했습니다.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
        data={prayers as Prayer[]}
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
        ListEmptyComponent={
          <View style={{ marginTop: 40 }}>
            <Text style={{ textAlign: 'center', color: theme.colors.subtext }}>
              등록된 기도제목이 없습니다.
            </Text>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}
