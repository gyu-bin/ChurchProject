// components/NotificationList.tsx
import { db } from '@/firebase/config';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

export default function NotificationList({ userEmail }: { userEmail: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('recipient', '==', userEmail),
      orderBy('createdAt', 'desc'),
      limit(20) // ✅ 최초 20개만 가져오기 (많을 경우)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(list);
    });

    return unsubscribe;
  }, [userEmail]);

  const handleNotificationClick = useCallback((notification: any) => {
    console.log('🔔 알림 클릭:', notification);
    
    // 알림 타입에 따른 처리
    switch (notification.type) {
      case 'team_invite':
        if (notification.teamId) {
          router.push(`/teams/${notification.teamId}`);
        } else {
          router.push('/teams');
        }
        break;
      case 'prayer_request':
        router.push('/share/allPrayer');
        break;
      case 'notice':
        router.push('/home/notice/allNotice');
        break;
      case 'department_post':
        if (notification.postId) {
          router.push(`/department/detail/${notification.postId}`);
        } else {
          router.push('/(tabs)/departments');
        }
        break;
      case 'sermon_question':
        if (notification.questionId) {
          router.push(`/share/sermon/sermonQustionDeatil?id=${notification.questionId}`);
        } else {
          router.push('/share/sermon/SermonQuestionPage');
        }
        break;
      case 'calendar_event':
        router.push('/home/QuickMenuButton/calendar');
        break;
      case 'forest_post':
        router.push('/share/forest');
        break;
      default:
        // 기본 처리 - 알림 메시지 표시
        Alert.alert('알림', notification.message || '새로운 알림이 있습니다.');
    }
    
    // TODO: 알림 읽음 처리 로직 추가
    // markNotificationAsRead(notification.id);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <Text style={styles.item} onPress={() => handleNotificationClick(item)}>
        • {item.message}
      </Text>
    ),
    [handleNotificationClick]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📬 알림</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={10} // ✅ 초기 렌더링 항목 수
        maxToRenderPerBatch={10} // ✅ 한 번에 렌더링할 최대 항목
        windowSize={5} // ✅ 가상화 윈도우 크기
        removeClippedSubviews={true} // ✅ 화면 밖 아이템 제거
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  item: {
    fontSize: 15,
    marginBottom: 8,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
});
