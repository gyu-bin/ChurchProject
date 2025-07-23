import FlexibleCarousel from '@/components/FlexibleCarousel';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

type Notice = {
  id: string;
  type: 'notice' | 'event';
  title: string;
  content: string;
  date?: any;
  startDate?: any;
  endDate?: any;
  time?: string;
  place?: string;
  campus?: string;
};

export default function HomeNotices() {
  const { colors, spacing, font, radius } = useDesign();
  const [notices, setNotices] = useState<any[]>([]);
  const frame = useSafeAreaFrame();
  useEffect(() => {
    const noticeQ = query(collection(db, 'notice'), where('type', '==', 'notice'));

    const unsubNotice = onSnapshot(noticeQ, (snapshot) => {
      const noticeList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Notice, 'id'>),
      }));
      setNotices(noticeList.slice(0, 5)); // 공지사항 2개
    });

    return () => {
      unsubNotice();
    };
  }, []);

  const renderNoticeCard = (item: Notice) => {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/home/notice/allNotice?id=${item.id}`)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#ddd',
          padding: spacing.md,
          marginBottom: spacing.xs,
          marginTop: spacing.sm,
          marginLeft: spacing.xs,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 4,
          elevation: 10,
          width: frame.width * 0.75,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          {/* ✅ 공지사항 뱃지 */}
          {/*<Text*/}
          {/*  style={{*/}
          {/*    backgroundColor: '#E3F2FD',*/}
          {/*    color: '#1976D2',*/}
          {/*    fontSize: 11,*/}
          {/*    fontWeight: 'bold',*/}
          {/*    paddingHorizontal: 6,*/}
          {/*    paddingVertical: 2,*/}
          {/*    borderRadius: 4,*/}
          {/*    marginRight: 6,*/}
          {/*  }}>*/}
          {/*  광고*/}
          {/*</Text>*/}

          {/* ✅ 캠퍼스 뱃지 */}
          {item.campus && (
            <Text
              style={{
                backgroundColor: '#F3E5F5',
                color: '#6A1B9A',
                fontSize: 11,
                fontWeight: 'bold',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                marginRight: 6,
              }}>
              {item.campus}
            </Text>
          )}

          <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>

          {/* 날짜 */}
          <Text style={{ fontSize: 12, color: colors.subtext }}>
            {item.date?.seconds
              ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
              : ''}
          </Text>
        </View>

        <Text
          style={{ fontSize: 14, color: colors.subtext }}
          numberOfLines={2} // 최대 2줄 표시
          ellipsizeMode='tail' // 두 줄 넘어가면 ... 처리
        >
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* 📢 공동체 소식 */}
      <View style={{ marginBottom: spacing.sm }}>
        <View>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>
              📢 시광 광고
            </Text>
            {/* <Ionicons name='chevron-forward' size={20} color={colors.text} /> */}
          </View>
        </View>

        {notices.length >= 1 && (
          <View>
            <FlexibleCarousel data={notices} renderItem={renderNoticeCard} />
          </View>
        )}
      </View>
    </View>
  );
}
