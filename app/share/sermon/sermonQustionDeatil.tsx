import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { useAuth } from '@/hooks/useAuth';
import { useAddSermonReply, useDeleteSermonReply, useUpdateSermonReply } from '@/hooks/useSermonQuestions';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SermonQuestion = { id: string; content: string; author?: string };
type SermonReply = { id: string; content: string; author?: string };

export default function SermonQuestionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useDesign();
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // TanStack Query 기반 데이터 패칭
  const { data: question, isLoading: questionLoading, refetch: refetchQuestion } = useQuery<SermonQuestion | null>({
    queryKey: ['sermon_question', id],
    queryFn: async () => {
      if (!id) return null;
      // 실제 fetch 로직으로 대체
      return null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const { data: replies = [], isLoading: repliesLoading, refetch: refetchReplies } = useQuery<SermonReply[]>({
    queryKey: ['sermon_replies', id],
    queryFn: async () => {
      if (!id) return [];
      // 실제 fetch 로직으로 대체
      return [];
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // 답글 mutation 훅
  const addReply = useAddSermonReply();
  const updateReply = useUpdateSermonReply();
  const deleteReply = useDeleteSermonReply();

  // 답글 항상 최신화: 화면 진입 시 refetch
  useEffect(() => {
    if (id) refetchReplies();
  }, [id]);

  const loading = questionLoading || repliesLoading;

  const submitReply = async () => {
    if (submitLoading) return;
    setSubmitLoading(true);
    setWriteModalVisible(false);
    if (!replyText.trim()) {
      setSubmitLoading(false);
      return;
    }
    try {
      if (editingReplyId) {
        await updateReply.mutateAsync({ questionId: id!, id: editingReplyId, content: replyText });
      } else {
        await addReply.mutateAsync({ questionId: id!, content: replyText, author: anonymous ? '익명' : (user?.name || '익명') });
      }
    } catch (e) {
      console.error('답글 저장 오류', e);
    } finally {
      setReplyText('');
      setEditingReplyId(null);
      setAnonymous(false);
      setSubmitLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await deleteReply.mutateAsync({ questionId: id!, replyId });
    } catch (e) {
      console.error('답글 삭제 오류', e);
    }
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
          <OptimizedFlatList
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}>
                      <TouchableOpacity
                        onPress={() => {
                          setReplyText(item.content);
                          setEditingReplyId(item.id);
                          setWriteModalVisible(true);
                        }}>
                        <Text style={{ color: colors.primary, fontSize: 12 }}>✏️ 수정</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleDeleteReply(item.id)}>
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
                    {/* 익명 체크박스 */}
                    <TouchableOpacity
                      onPress={() => setAnonymous((prev) => !prev)}
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: anonymous ? colors.primary : colors.border,
                          backgroundColor: anonymous ? colors.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing.sm,
                        }}>
                        {anonymous && <Ionicons name='checkmark' size={16} color='#fff' />}
                      </View>
                      <Text style={{ color: colors.text, fontSize: 15 }}>익명으로 작성</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={submitLoading ? undefined : submitReply}
                      disabled={submitLoading}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                        marginTop: spacing.lg,
                        opacity: submitLoading ? 0.7 : 1,
                      }}>
                      {submitLoading ? (
                        <ActivityIndicator color='#fff' />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                      )}
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
