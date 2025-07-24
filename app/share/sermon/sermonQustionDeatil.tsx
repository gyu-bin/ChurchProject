// 기존 import들 유지
import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { useAddSermonReply, useDeleteSermonReply, useUpdateSermonReply } from '@/hooks/useSermonQuestions';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl,
  Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SermonQuestion = { id: string; content: string; author?: string };
type SermonReply = { id: string; content: string; author?: string; createdAt?: string };

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
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const { data: question, isLoading: questionLoading, refetch: refetchQuestion } = useQuery<SermonQuestion | null>({
    queryKey: ['sermon_question', id],
    queryFn: async () => {
      if (!id) return null;
      const docRef = doc(db, 'sermon_questions', id);
      const snap = await getDoc(docRef);
      return snap.exists() ? { id: snap.id, ...snap.data() } as SermonQuestion : null;
    },
    enabled: !!id,
  });

  const { data: repliesData = [], isLoading: repliesLoading, refetch: refetchReplies } = useQuery<SermonReply[]>({
    queryKey: ['sermon_replies', id],
    queryFn: async () => {
      if (!id) return [];
      const colRef = collection(db, 'sermon_questions', id, 'replies');
      const snap = await getDocs(colRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SermonReply[];
    },
    enabled: !!id,
  });

  const addReply = useAddSermonReply();
  const updateReply = useUpdateSermonReply();
  const deleteReply = useDeleteSermonReply();

  useEffect(() => {
    if (id) refetchReplies();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchReplies();
    await refetchQuestion();
    setRefreshing(false);
  };

  const submitReply = async () => {
    if (submitLoading || !replyText.trim()) return;
    setSubmitLoading(true);
    try {
      if (editingReplyId) {
        await updateReply.mutateAsync({ questionId: id!, id: editingReplyId, content: replyText });
      } else {
        const newReply = {
          content: replyText,
          author: anonymous ? '익명' : (user?.name || '익명'),
          createdAt: new Date().toISOString(),
        };
        const colRef = collection(db, 'sermon_questions', id!, 'replies');
        await addDoc(colRef, newReply);
      }
      await refetchReplies();
    } catch (e) {
      console.error('답글 저장 오류', e);
    } finally {
      setReplyText('');
      setEditingReplyId(null);
      setAnonymous(false);
      setWriteModalVisible(false);
      setSubmitLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!id) return;
            await deleteDoc(doc(db, 'sermon_questions', id, 'replies', replyId));
            await refetchReplies();
          } catch (e) {
            console.error('답글 삭제 오류', e);
          }
        },
      },
    ]);
  };

  const sortedReplies = [...repliesData].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const loading = questionLoading || repliesLoading;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ backgroundColor: colors.background, paddingTop: insets.top, flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name='arrow-back' size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ marginLeft: spacing.sm, fontSize: 18, fontWeight: 'bold', color: colors.text }}>질문 상세</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
        ) : (
          <OptimizedFlatList
            data={sortedReplies}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <View style={{ padding: spacing.md }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{question?.content}</Text>
                <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>작성자: {question?.author || '익명'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={{ backgroundColor: colors.surface, borderRadius: 8, margin: spacing.sm, padding: spacing.md }}>
                <Text style={{ color: colors.text }}>{item.content}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ color: colors.subtext, fontSize: 12 }}>- {item.author}</Text>
                  {user?.name === item.author && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity onPress={() => { setReplyText(item.content); setEditingReplyId(item.id); setWriteModalVisible(true); }}>
                        <Text style={{ color: colors.primary, fontSize: 12 }}>✏️ 수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteReply(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 12 }}>🗑 삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListFooterComponent={
              <TouchableOpacity
                onPress={() => { setReplyText(''); setWriteModalVisible(true); }}
                style={{
                  backgroundColor: colors.primary, borderRadius: 20, paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg, alignSelf: 'center', marginVertical: spacing.lg,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✍️ 답글 작성</Text>
              </TouchableOpacity>
            }
          />
        )}

        {/* Modal */}
        <Modal visible={writeModalVisible} animationType='slide' transparent>
          <TouchableWithoutFeedback onPress={() => setWriteModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior='padding'>
                <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>답글 작성</Text>
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
                      borderColor: colors.border, borderWidth: 1, borderRadius: 12,
                      padding: spacing.md, minHeight: 100, color: colors.text,
                    }}
                  />

                  {/* 익명 */}
                  <TouchableOpacity
                    onPress={() => setAnonymous(prev => !prev)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                      borderColor: anonymous ? colors.primary : colors.border,
                      backgroundColor: anonymous ? colors.primary : 'transparent',
                      justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm
                    }}>
                      {anonymous && <Ionicons name='checkmark' size={16} color='#fff' />}
                    </View>
                    <Text style={{ color: colors.text }}>익명으로 작성</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={submitReply}
                    disabled={submitLoading}
                    style={{
                      backgroundColor: colors.primary, borderRadius: 12,
                      paddingVertical: spacing.md, alignItems: 'center',
                      opacity: submitLoading ? 0.7 : 1
                    }}>
                    {submitLoading ? <ActivityIndicator color='#fff' /> : (
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}