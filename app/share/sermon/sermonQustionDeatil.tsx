import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { font, useDesign } from '@/context/DesignSystem';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SermonQuestionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useDesign();
  const { user } = useAuth();
  const [question, setQuestion] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const fetchQuestion = async () => {
      const docRef = doc(db, 'sermon_questions', id!);
      const snap = await getDoc(docRef);
      if (snap.exists()) setQuestion({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    const q = query(
      collection(db, 'sermon_questions', id!, 'replies'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReplies(data);
    });

    fetchQuestion();
    return unsubscribe;
  }, [id]);

  const submitReply = async () => {
    setWriteModalVisible(false);

    if (!replyText.trim()) return;

    const repliesRef = collection(db, 'sermon_questions', id!, 'replies');

    try {
      if (editingReplyId) {
        // ✅ 수정
        const replyDocRef = doc(repliesRef, editingReplyId);
        await updateDoc(replyDocRef, {
          content: replyText,
          editedAt: serverTimestamp(), // 수정 시간 추가 (옵션)
        });
      } else {
        // ✅ 새 답글 추가
        await addDoc(repliesRef, {
          content: replyText,
          author: user?.name || '익명',
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('답글 저장 오류', e);
    } finally {
      setReplyText('');
      setEditingReplyId(null); // ✅ 수정 후 초기화
    }
  };

  const deleteReply = async (replyId: string) => {
    await deleteDoc(doc(db, 'sermon_questions', id!, 'replies', replyId));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top : insets.top,
      }}>
      {/* 🔝 상단 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.sm }}>
          <Ionicons name='arrow-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
          {question?.content}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size='large' color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <View style={{ flex: 1, padding: spacing.md }}>
          {/* 📝 질문 본문 */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              {question?.content}
            </Text>
            <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>
              작성자: {question?.author || '익명'}
            </Text>
          </View>

          {/* 💬 답글 목록 */}
          <FlatList
            data={replies}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}>
                {/* 📝 답글 내용 */}
                <Text style={{ color: colors.text }}>{item.content}</Text>

                {/* 👤 작성자 + 수정/삭제 버튼 */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                  }}>
                  <Text style={{ color: colors.subtext, fontSize: 12 }}>- {item.author}</Text>

                  {user?.name === item.author && (
                    <View
                      style={{
                        flexDirection: 'row', // 👉 가로 배치
                        alignItems: 'center',
                        gap: spacing.sm, // 버튼 간격
                      }}>
                      <TouchableOpacity
                        onPress={() => {
                          setReplyText(item.content); // 기존 내용 세팅
                          setEditingReplyId(item.id); // 수정 중인 답글 ID 저장
                          setWriteModalVisible(true);
                        }}>
                        <Text style={{ color: colors.primary, fontSize: 12 }}>✏️ 수정</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => deleteReply(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 14 }}>🗑 삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <TouchableOpacity
                onPress={() => {
                  setReplyText('');
                  setWriteModalVisible(true);
                }}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  alignSelf: 'center',
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✍️ 답글 작성</Text>
              </TouchableOpacity>
            }
          />

          {/* 답글 작성 모달 */}
          <Modal
            visible={writeModalVisible}
            animationType='slide'
            transparent
            onRequestClose={() => setWriteModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setWriteModalVisible(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <KeyboardAvoidingView
                  style={{ flex: 1, justifyContent: 'flex-end' }}
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      padding: spacing.lg,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: spacing.md,
                      }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                        답글 작성
                      </Text>
                      <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                        <Ionicons name='close' size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      placeholder='답글 내용을 입력하세요...'
                      placeholderTextColor={colors.subtext}
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline
                      style={{
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: spacing.md,
                        minHeight: 100,
                        color: colors.text,
                      }}
                    />

                    <TouchableOpacity
                      onPress={submitReply}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                        marginTop: spacing.lg,
                      }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
