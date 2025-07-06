import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config'; // Firebase 초기화된 객체
import { showToast } from "@/utils/toast";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {useSafeAreaFrame, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from "@expo/vector-icons";
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

export default function PrayerListScreen() {
  const { mode } = useAppTheme();
  const theme = useDesign();
    const frame = useSafeAreaFrame();
    const screenWidth = frame.width;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
    const isDark = mode === 'dark';
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
    const snapshot = await getDocs(collection(db, 'prayer_requests'));
    const data: PrayerItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<PrayerItem, 'id'>),
    }));
    setPrayers(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPrayers(); // 페이지가 focus될 때마다 최신 데이터로 갱신
    }, [])
  );

  useEffect(() => {
    fetchPrayers();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prayer_requests', id));
      setPrayers(prev => prev.filter(p => p.id !== id));
      showToast('🙏 기도제목이 삭제되었습니다.');
    } catch (error) {
      console.error('🔥 기도제목 삭제 실패:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrayers();
    setRefreshing(false);
  };

  const sortedPrayers = prayers.slice().sort((a, b) =>
    (b.createdAt?.toDate?.()?.getTime?.() || 0) -
    (a.createdAt?.toDate?.()?.getTime?.() || 0)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background,paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0,}}>
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 20,
                paddingHorizontal: 20,
                position: 'relative',
            }}
        >
            {/* ← 돌아가기 버튼 (좌측) */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={{
                    position: 'absolute',
                    left: 20,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                }}
            >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/* 중앙 타이틀 */}
            <Text
                style={{
                    flex: 1,
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                    textAlign: 'center',
                    top:10
                }}
            >
                📃 전체 기도제목
            </Text>

            {/* 🙏 기도제목 나누기 버튼 (우측) */}
            <TouchableOpacity
                onPress={() => router.push('/share/prayerModal')}
                style={{
                    position: 'absolute',
                    right: 20,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                }}
            >
                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>🙏 나누기</Text>
            </TouchableOpacity>
        </View>

      <FlatList
        data={sortedPrayers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => {
            const isUrgent = item.urgent === 'Y';
            const isDark = mode === 'dark'; // ✅ 다크모드 체크

            return (
                <View
                    style={{
                        backgroundColor: isUrgent
                            ? isDark
                                ? '#7F1D1D' // 🔥 다크모드 긴급 배경
                                : '#FEF2F2' // 🔥 라이트모드 긴급 배경
                            : theme.colors.surface,
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
                    }}
                >
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: '600',
                            color: isUrgent
                                ? (isDark ? '#F87171' : '#DC2626') // 🔥 긴급 제목 컬러
                                : theme.colors.primary,
                            marginBottom: 8,
                        }}
                    >
                        {isUrgent ? `🔥 ${item.title}` : `🙏 ${item.title}`}
                    </Text>

                    <Text
                        style={{
                            fontSize: 15,
                            color: theme.colors.text,
                            marginBottom: 10,
                            lineHeight: 22,
                        }}
                    >
                        {item.content}
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            color: theme.colors.text,
                            textAlign: 'right',
                        }}
                    >
                        - {item.anonymous === 'Y' ? '익명' : item.name}
                    </Text>

                    {currentUser.email === item.email && (
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
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                                삭제
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }}
      />
    </SafeAreaView>
  );
}
