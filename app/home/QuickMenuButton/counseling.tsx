// app/counsel/request.tsx
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import {
    addDoc, collection,
    getDocs, query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    Text, TextInput, TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {sendNotification, sendPushNotification} from "@/services/notificationService";

export default function CounselRequestPage() {
  const { colors, spacing, font, radius } = useDesign();
  const { mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [user, setUser] = useState<any>(null);

  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
const handleOpenHistory = () => setIsHistoryModalVisible(true);
const handleCloseHistory = () => setIsHistoryModalVisible(false);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) setUser(JSON.parse(raw));
    };
    loadUser();
  }, []);

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('알림', '상담 제목과 내용을 입력해주세요.');
            return;
        }

        try {
            // 1. 상담 요청 등록
            await addDoc(collection(db, 'counsel_requests'), {
                content,
                email: user?.email,
                name: user?.name,
                createdAt: serverTimestamp(),
            });

            // 2. 교역자 리스트 조회
            try {
                const pastorSnap = await getDocs(
                    query(collection(db, 'users'), where('role', '==', '교역자'))
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
                                    title: '📩 상담 요청이 도착했어요',
                                    body: `${user?.name}님이 심방을 요청했습니다.`,
                                })
                            );
                        }
                    });

                    // 💬 알림(Notification) Firestore 저장
                    notifyPromises.push(
                        sendNotification({
                            to: toEmail,
                            message: `${user?.name}님이 심방을 요청했습니다.`,
                            type: 'counsel_request',
                        })
                    );
                });

                await Promise.all([...pushPromises, ...notifyPromises]);
                console.log(`✅ ${sentTokens.size}명의 교역자에게 푸시 + 알림 전송 완료`);
            } catch (err) {
                console.error('❌ 교역자 푸시/알림 실패:', err);
            }

            Alert.alert('제출 완료', '상담 요청이 등록되었습니다.');
            router.back();
        } catch (e) {
            console.error('상담 등록 오류:', e);
            Alert.alert('오류', '제출 중 문제가 발생했습니다.');
        }
    };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ flex: 1, padding: spacing.lg }}>

          <View
  style={{
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? insets.top + 10 : 16,
    // paddingHorizontal: 20,
    paddingBottom: 16,
  }}
>
  {/* 왼쪽: 돌아가기 */}
  <TouchableOpacity onPress={() => router.back()}>
    <Text style={{ color: colors.text, fontSize: font.body }}>←</Text>
  </TouchableOpacity>

  {/* 가운데: 타이틀 (absolute 중앙) */}
  <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
    <Text
      style={{
        fontSize: font.heading,
        fontWeight: 'bold',
        color: colors.text,
      }}
    >
      💬 교역자 상담 요청
    </Text>
  </View>

  {/* 오른쪽: 상담 내역 보기 */}
  <TouchableOpacity onPress={handleOpenHistory}>
    <Text style={{ color: colors.primary, fontSize: font.caption }}>상담 내역 보기</Text>
  </TouchableOpacity>
</View>

            <TextInput
              placeholder="상담 내용을 입력해주세요"
              placeholderTextColor={colors.placeholder}
              value={content}
              onChangeText={setContent}
              multiline
              style={{
                borderBottomWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontSize: font.body,
                marginBottom: spacing.lg,
                paddingVertical: spacing.sm,
              }}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: font.body }}>
                💌 상담 요청하기
              </Text>
            </TouchableOpacity>
          </View>

          <Modal visible={isHistoryModalVisible} animationType="slide">
  <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    {/* 닫기 버튼 */}
    <TouchableOpacity
      onPress={handleCloseHistory}
      style={{
        alignSelf: 'flex-end',
        padding: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16 }}>✖ 닫기</Text>
    </TouchableOpacity>

    <Text
      style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
      }}
    >
      📂 나의 상담 내역
    </Text>

    {/* 예시: 상담 리스트 */}
    {/* <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
      {myCounselHistory.length > 0 ? (
        myCounselHistory.map((item, index) => (
          <View
            key={index}
            style={{
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.title}</Text>
            <Text style={{ color: colors.subtext, marginTop: 6 }}>{item.content}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.subtext, textAlign: 'center' }}>
          상담 내역이 없습니다.
        </Text>
      )}
    </ScrollView> */}
  </SafeAreaView>
</Modal>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
