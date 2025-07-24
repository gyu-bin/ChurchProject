// components/NotificationList.tsx
import { db } from '@/firebase/config';
import { useRouter } from 'expo-router';
import { collection, DocumentData, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-root-toast';

export default function NotificationList({ userEmail }: { userEmail: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  // 최초 10개 불러오기
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'notifications'),
          where('to', '==', userEmail),
          // orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotifications(list);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === 10);
      } catch (e) {
        Toast.show('알림을 불러오지 못했습니다. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [userEmail]);

  // 추가 데이터 불러오기
  const fetchMore = async () => {
    if (loading || !hasMore || !lastVisible) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('to', '==', userEmail),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications((prev) => [...prev, ...list]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || lastVisible);
      setHasMore(snapshot.docs.length === 10);
    } catch (e) {
      Toast.show('알림 추가 로딩 실패. 네트워크를 확인해주세요.', { position: Toast.positions.CENTER });
    } finally {
      setLoading(false);
    }
  };

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
        keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={loading ? <Text style={{textAlign:'center',padding:10}}>불러오는 중...</Text> : null}
        ListEmptyComponent={!loading ? <Text style={{textAlign:'center',padding:20,color:'#888'}}>알림이 없습니다.</Text> : null}
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
