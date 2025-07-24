// app/counsel/request.tsx
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CounselRequestPage() {
  const { colors, spacing, font, radius } = useDesign();
  const { mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [selectedPastor, setSelectedPastor] = useState<string | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

  const { data: pastors = [], isLoading: loadingPastors } = useQuery<any[]>({
    queryKey: ['pastors'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', '교역자')));
      return snap.docs.map(doc => ({ label: doc.data().name, value: doc.data().email }));
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { data: myCounselHistory = [], isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['myCounselHistory', user?.email, isHistoryModalVisible],
    queryFn: async () => {
      if (!user?.email || !isHistoryModalVisible) return [];
      const snap = await getDocs(query(collection(db, 'counsel_requests'), where('email', '==', user.email)));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user?.email && isHistoryModalVisible,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const handleOpenHistory = () => setIsHistoryModalVisible(true);
  const handleCloseHistory = () => setIsHistoryModalVisible(false);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) setUser(JSON.parse(raw));
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isHistoryModalVisible && user?.email) {
      const fetchMyHistory = async () => {
        try {
          const snap = await getDocs(
            query(collection(db, 'counsel_requests'), where('email', '==', user.email))
          );
          const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          // setMyCounselHistory(data); // This line is removed as per the new_code
        } catch (err) {
          console.error('심방 내역 불러오기 실패:', err);
        }
      };
      // fetchMyHistory(); // This line is removed as per the new_code
    }
  }, [isHistoryModalVisible, user]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '심방 제목과 내용을 입력해주세요.');
      return;
    }

    if (!selectedPastor) {
      Alert.alert('알림', '심방 받을 교역자를 선택해주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'counsel_requests'), {
        content,
        email: user?.email,
        name: user?.name,
        pastorName: selectedPastor,
        createdAt: serverTimestamp(),
      });

      const pastorSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', selectedPastor))
      );

      const sentTokens = new Set<string>();
      const pushPromises: Promise<void>[] = [];
      const notifyPromises: Promise<void>[] = [];

      pastorSnap.docs.forEach((docSnap) => {
        const pastor = docSnap.data();
        const tokens: string[] = pastor.expoPushTokens || [];
        const toEmail = pastor.email;

        tokens.forEach((token) => {
          if (
            typeof token === 'string' &&
            token.startsWith('ExponentPushToken') &&
            !sentTokens.has(token)
          ) {
            sentTokens.add(token);
            pushPromises.push(
              sendPushNotification({
                to: token,
                title: '📩 심방 요청이 도착했어요',
                body: `${user?.name}님이 심방을 요청했습니다.`,
              })
            );
          }
        });

        notifyPromises.push(
          sendNotification({
            to: toEmail,
            message: `📩 ${user?.name}님이 심방을 요청했습니다.`,
            type: 'counsel_request',
          })
        );
      });

      await Promise.all([...pushPromises, ...notifyPromises]);
      console.log(`✅ ${sentTokens.size}명의 교역자에게 푸시 + 알림 전송 완료`);

      Alert.alert('제출 완료', '심방 요청이 등록되었습니다.');
      router.back();
    } catch (e) {
      console.error('심방 등록 오류:', e);
      Alert.alert('오류', '제출 중 문제가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, padding: spacing.lg }}>
            {/* 헤더 */}
            <View
              style={{
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: Platform.OS === 'android' ? insets.top : 16,
                paddingBottom: 16,
              }}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name='arrow-back' size={24} color={colors.text} />
              </TouchableOpacity>
              <View
                style={{ position: 'absolute', top: 20, left: 0, right: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
                  💬 교역자 심방 요청
                </Text>
              </View>
              <TouchableOpacity onPress={handleOpenHistory}>
                <Text style={{ color: colors.primary, fontSize: font.caption }}>심방 내역</Text>
              </TouchableOpacity>
            </View>

            {/* 교역자 선택 */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: font.caption, marginBottom: 4 }}>
                👤 심방 대상 교역자
              </Text>
              <Dropdown
                style={{
                  height: 50,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surface,
                }}
                placeholderStyle={{ color: colors.subtext }}
                selectedTextStyle={{ color: colors.text }}
                data={pastors}
                labelField='label'
                valueField='value'
                placeholder='교역자를 선택해주세요'
                value={selectedPastor}
                onChange={(item) => setSelectedPastor(item.label)}
              />
            </View>

            {/* 내용 입력 */}
            <TextInput
              placeholder='심방 내용을 입력해주세요'
              placeholderTextColor={colors.placeholder}
              value={content}
              onChangeText={setContent}
              multiline
              scrollEnabled
              style={{
                borderBottomWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontSize: font.body,
                marginBottom: spacing.lg,
                paddingVertical: spacing.sm,
                maxHeight: 200,
              }}
            />

            {/* 제출 버튼 */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: font.body }}>
                💌 심방 요청하기
              </Text>
            </TouchableOpacity>
          </View>

          {/* 상담 내역 모달 */}
          <Modal visible={isHistoryModalVisible} animationType='slide'>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              <TouchableOpacity
                onPress={handleCloseHistory}
                style={{ alignSelf: 'flex-end', padding: 16 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>✖ 닫기</Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: colors.text,
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                📂 나의 심방 내역
              </Text>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
                {myCounselHistory.length > 0 ? (
                  myCounselHistory.map((item, index) => (
                    <View
                      key={item.id || index}
                      style={{
                        backgroundColor: colors.surface,
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 12,
                      }}>
                      {item.pastorName && (
                        <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 4 }}>
                          📌 대상 교역자: {item.pastorName}
                        </Text>
                      )}
                      <Text style={{ color: colors.text }}>{item.content}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 6 }}>
                        작성일:{' '}
                        {item.createdAt?.seconds
                          ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                          : '-'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colors.subtext, textAlign: 'center' }}>
                    심방 내역이 없습니다.
                  </Text>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
