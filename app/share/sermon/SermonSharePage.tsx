import OptimizedFlatList from '@/components/OptimizedFlatList';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

export default function SermonSharePage() {
  const { colors, spacing, font } = useDesign();
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [content, setContent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [anonymous, setAnonymous] = useState(false);
  const insets = useSafeAreaInsets();
  const PAGE_SIZE = 10;

  useEffect(() => {
    getCurrentUser().then(setUser);
    fetchInitialShares();
  }, []);

  const fetchInitialShares = async () => {
    setLoading(true);
    const q = query(
      collection(db, 'sermon_shares'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setShares(data);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLoading(false);
  };

  const fetchMoreShares = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const q = query(
      collection(db, 'sermon_shares'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setShares((prev) => [...prev, ...data]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const handleAddShare = async () => {
    if (!title || !content || !preacher) {
      Alert.alert('입력 오류', '모든 항목을 입력하세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'sermon_shares'), {
        title,
        preacher,
        content,
        anonymous,
        userEmail: user?.email,
        createdAt: serverTimestamp(),
      });
      resetForm();
      setModalVisible(false);
      fetchInitialShares(); // 새 글 등록 후 목록 새로고침
    } catch (e) {
      console.error('등록 실패:', e);
      Alert.alert('등록 실패', '나눔 등록 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateShare = async () => {
    if (!title || !content || !preacher || !selectedPost) return;

    try {
      await updateDoc(doc(db, 'sermon_shares', selectedPost.id), {
        title,
        preacher,
        content,
        anonymous,
        updatedAt: serverTimestamp(),
      });
      resetForm();
      setEditModalVisible(false);
      fetchInitialShares(); // 수정 후 목록 새로고침
    } catch (e) {
      console.error('수정 실패:', e);
      Alert.alert('수정 실패', '글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteShare = async (id: string) => {
    Alert.alert('삭제 확인', '정말 이 글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'sermon_shares', id));
            setShares((prev) => prev.filter((item) => item.id !== id));
          } catch (e) {
            console.error('삭제 실패:', e);
            Alert.alert('삭제 실패', '글 삭제 중 오류가 발생했습니다.');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setPreacher('');
    setContent('');
    setAnonymous(false);
    setSelectedPost(null);
  };

  const isMyPost = (item: any) => item.userEmail === user?.email;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {loading ? (
        <ActivityIndicator size='large' color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <OptimizedFlatList
          data={shares}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                marginBottom: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.text }}>
                {item.title}
              </Text>
              <Text style={{ color: colors.subtext, marginBottom: spacing.xs }}>
                {item.preacher}
              </Text>
              <Text style={{ color: colors.text, marginBottom: spacing.xs }}>{item.content}</Text>

              {isMyPost(item) && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: spacing.sm,
                  }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPost(item);
                      setTitle(item.title);
                      setPreacher(item.preacher);
                      setContent(item.content);
                      setEditModalVisible(true);
                    }}
                    style={{ marginRight: spacing.sm }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteShare(item.id)}>
                    <Text style={{ color: 'red', fontWeight: 'bold' }}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          onEndReached={fetchMoreShares}
          onEndReachedThreshold={0.1}
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
          right: 24,
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 32,
          elevation: 4,
        }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 나눔</Text>
      </TouchableOpacity>

      {/* ➕ 플로팅 버튼 */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 24,
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 32,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 나눔</Text>
      </TouchableOpacity>

      {/* 작성 모달 */}
      <CenteredModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        onSubmit={handleAddShare}
        title={title}
        setTitle={setTitle}
        preacher={preacher}
        setPreacher={setPreacher}
        content={content}
        setContent={setContent}
        heading='✍️ 나눔 작성'
        anonymous={anonymous} // 🟢 추가
        setAnonymous={setAnonymous} // 🟢 추가
      />

      {/* 수정 모달 */}
      <CenteredModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          resetForm();
        }}
        onSubmit={handleUpdateShare}
        title={title}
        setTitle={setTitle}
        preacher={preacher}
        setPreacher={setPreacher}
        content={content}
        setContent={setContent}
        heading='✏️ 나눔 수정'
        anonymous={anonymous} // 🟢 추가
        setAnonymous={setAnonymous} // 🟢 추가
      />
    </View>
  );
}

function CenteredModal({
  visible,
  onClose,
  onSubmit,
  title,
  setTitle,
  preacher,
  setPreacher,
  content,
  setContent,
  heading,
  anonymous,
  setAnonymous,
}: any) {
  const { colors, spacing, font, radius } = useDesign();
  // const [anonymous, setAnonymous] = useState(true);
  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end', // ✅ Apple 시트 스타일
          }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg * 2,
              borderTopRightRadius: radius.lg * 2,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg + 20, // SafeArea 대응
              minHeight: '90%', // ✅ 높이 제한
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
                {heading}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name='close' size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* 입력 필드 */}
            <TextInput
              placeholder='제목'
              placeholderTextColor={colors.subtext}
              value={title}
              onChangeText={setTitle}
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
            />
            <TextInput
              placeholder='설교자'
              placeholderTextColor={colors.subtext}
              value={preacher}
              onChangeText={setPreacher}
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
            />
            <TextInput
              placeholder='내용'
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

            <TouchableOpacity
              onPress={() => setAnonymous((prev: boolean) => !prev)}
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
                  borderColor: anonymous ? colors.primary : colors.border, // ✅ 선택 시 primary
                  backgroundColor: anonymous ? colors.primary : colors.surface, // ✅ 선택 시 filled
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  borderRadius: 6, // ✅ 둥글게 (iOS 스타일)
                  shadowColor: '#000',
                  shadowOpacity: anonymous ? 0.2 : 0, // ✅ 선택 시 약간 그림자
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 3,
                  elevation: anonymous ? 3 : 0, // ✅ Android 그림자
                }}>
                {anonymous && (
                  <Ionicons
                    name='checkmark'
                    size={16}
                    color='#fff' // ✅ 선택 시 체크는 흰색
                  />
                )}
              </View>
              <Text style={{ fontSize: font.body, color: colors.text }}>익명으로 나누기</Text>
            </TouchableOpacity>

            {/* 완료 버튼 */}
            <TouchableOpacity
              onPress={onSubmit}
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
  );
}
