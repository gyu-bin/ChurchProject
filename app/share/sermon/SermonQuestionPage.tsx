import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { useFirestoreDeleteDoc, useFirestoreUpdateDoc } from '@/hooks/useFirestoreQuery';
import { queryKeys } from '@/hooks/useQueryKeys';
import { useAddSermonQuestion, useSermonQuestions } from '@/hooks/useSermons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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

export default function SermonQuestionPage() {
  const { colors, spacing, font, radius } = useDesign();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const PAGE_SIZE = 10;

  // TanStack Query 기반 질문 목록
  const { data: questions = [], isLoading, refetch } = useSermonQuestions(PAGE_SIZE) as { data: any[], isLoading: boolean, refetch: () => void };
  const addQuestion = useAddSermonQuestion();
  const updateQuestion = useFirestoreUpdateDoc('sermon_questions', [queryKeys.sermons.list() as unknown as unknown[]]);
  const deleteQuestion = useFirestoreDeleteDoc('sermon_questions', [queryKeys.sermons.list() as unknown as unknown[]]);
  const [loadingMore, setLoadingMore] = useState(false); // 무한 스크롤 미지원(추후 구현)

  // fetchInitialQuestions = async () => { // 기존 코드 제거
  //   setLoading(true);
  //   const q = query(
  //     collection(db, 'sermon_questions'),
  //     orderBy('createdAt', 'desc'),
  //     limit(PAGE_SIZE)
  //   );
  //   const snapshot = await getDocs(q);
  //   const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  //   setQuestions(data);
  //   setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  //   setHasMore(snapshot.docs.length === PAGE_SIZE);
  //   setLoading(false);
  // };

  // fetchMoreQuestions = async () => { // 기존 코드 제거
  //   if (!hasMore || loadingMore) return;

  //   setLoadingMore(true);
  //   const q = query(
  //     collection(db, 'sermon_questions'),
  //     orderBy('createdAt', 'desc'),
  //     startAfter(lastVisible),
  //     limit(PAGE_SIZE)
  //   );
  //   const snapshot = await getDocs(q);
  //   const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  //   setQuestions((prev) => [...prev, ...data]);
  //   setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  //   setHasMore(snapshot.docs.length === PAGE_SIZE);
  //   setLoadingMore(false);
  // };

  const resetForm = () => {
    setContent('');
    setSelectedQuestion(null);
    setAnonymous(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('입력 오류', '질문 내용을 입력해주세요.');
      return;
    }
    const payload = {
      content,
      author: anonymous ? '익명' : '익명', // 실제 유저 정보 필요시 수정
      createdAt: new Date(),
    };
    try {
      if (selectedQuestion) {
        await updateQuestion.mutateAsync({ id: selectedQuestion.id, data: payload });
      } else {
        await addQuestion.mutateAsync(payload);
      }
      resetForm();
      setModalVisible(false);
      refetch();
    } catch (e) {
      console.error('저장 오류:', e);
      Alert.alert('저장 실패', '저장 중 문제가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuestion.mutateAsync(id);
            refetch();
          } catch (e) {
            console.error('삭제 오류:', e);
            Alert.alert('삭제 실패', '질문 삭제 중 문제가 발생했습니다.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    // 실제 유저 정보 필요시 isMyPost 조건 수정
    const isMyPost = false;
    return (
      <TouchableOpacity
        onPress={() => router.push(`/share/sermon/sermonQustionDeatil?id=${item.id}`)}
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderRadius: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: font.body }}>
          {item.content}
        </Text>
        <Text style={{ color: colors.subtext, marginTop: spacing.xs }}>{item.author}</Text>
        {isMyPost && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedQuestion(item);
                setContent(item.content);
                setModalVisible(true);
              }}
              style={{ marginRight: spacing.sm }}>
              <Text style={{ fontSize: 15, color: colors.primary, fontWeight: 'bold' }}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={{ fontSize: 15, color: 'red', fontWeight: 'bold' }}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.md }}>
      {isLoading ? (
        <ActivityIndicator size='large' color={colors.primary} />
      ) : (
        <OptimizedFlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          // onEndReached={fetchMoreQuestions} // 무한 스크롤 미지원(추후 구현)
          // onEndReachedThreshold={0.1}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : null
          }
        />
      )}

      {/* ➕ 플로팅 버튼 */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: spacing.lg,
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: 32,
          elevation: 4,
        }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 질문</Text>
      </TouchableOpacity>

      {/* 📌 Apple 스타일 중간 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType='slide'
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        statusBarTranslucent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'flex-end',
            }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg * 2,
                borderTopRightRadius: radius.lg * 2,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.lg + 20,
                minHeight: '60%',
              }}>
              {/* 드래그 핸들 */}
              <View
                style={{
                  alignItems: 'center',
                  marginBottom: spacing.md,
                }}>
                <View
                  style={{
                    width: 40,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: '#ccc',
                  }}
                />
              </View>

              {/* 헤더 */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.md,
                }}>
                <Text
                  style={{
                    fontSize: font.title,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}>
                  {selectedQuestion ? '✏️ 질문 수정' : '❓ 질문 작성'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}>
                  <Ionicons name='close' size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* 입력 */}
              <TextInput
                placeholder='질문 내용'
                placeholderTextColor={colors.subtext}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical='top'
                scrollEnabled
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  height: 200,
                  color: colors.text,
                  backgroundColor: colors.surface,
                }}
              />

              {/* 익명 선택 */}
              <TouchableOpacity
                onPress={() => setAnonymous((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingTop: spacing.lg,
                }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderWidth: 2,
                    borderColor: anonymous ? colors.primary : colors.border,
                    backgroundColor: anonymous ? colors.primary : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    borderRadius: 6,
                  }}>
                  {anonymous && <Ionicons name='checkmark' size={16} color='#fff' />}
                </View>
                <Text style={{ fontSize: font.body, color: colors.text }}>익명으로 질문하기</Text>
              </TouchableOpacity>

              {/* 완료 버튼 */}
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  backgroundColor: colors.primary,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  marginTop: spacing.lg,
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>완료</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
