import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDropdown from '@/components/dropDown';
import { getLinkPreview } from 'link-preview-js';

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  campus: string;
  link?: string;
  date?: {
    seconds: number;
    nanoseconds: number;
  };
}

const campusOptions = [
  { label: '문래', value: '문래' },
  { label: '신촌', value: '신촌' },
  { label: '시선교회', value: '시선교회' },
];

export default function NoticePage() {
  const [user, setUser] = useState<any>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [campus, setCampus] = useState('문래');
  const [link, setLink] = useState('');
  const { colors, spacing, font } = useDesign();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [linkPreview, setLinkPreview] = useState<any>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const listenUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (!raw) return;
      const cachedUser = JSON.parse(raw);
      const userRef = doc(db, 'users', cachedUser.email);

      unsubscribe = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const fresh = { ...docSnap.data(), email: cachedUser.email };
          setUser(fresh);
          await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
        }
      });
    };

    listenUser();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchNotices = async () => {
    try {
      const q = query(collection(db, 'notice'), where('type', '==', 'notice'));
      const snapshot = await getDocs(q);
      const fetched: NoticeItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NoticeItem[];
      setNotices(fetched);
    } catch (e) {
      console.error('❌ 공지 불러오기 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    const fetchPreview = async () => {
      if (link && link.startsWith('http')) {
        try {
          const data = await getLinkPreview(link);
          setLinkPreview(data);
        } catch (e) {
          console.error('🔗 링크 미리보기 실패:', e);
          setLinkPreview(null);
        }
      } else {
        setLinkPreview(null);
      }
    };
    fetchPreview();
  }, [link]);

  const openEditModal = (notice: NoticeItem) => {
    setEditMode(true);
    setEditId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setCampus(notice.campus);
    setLink(notice.link || '');
    setModalVisible(true);
  };

  const resetModal = () => {
    setEditMode(false);
    setEditId(null);
    setTitle('');
    setContent('');
    setCampus('문래');
    setLink('');
    setModalVisible(false);
  };

  const handleSaveNotice = async () => {
    if (!title || !content) {
      Alert.alert('입력 오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      if (editMode && editId) {
        await updateDoc(doc(db, 'notice', editId), {
          title,
          content,
          campus,
          link,
          date: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'notice'), {
          title,
          content,
          campus,
          link,
          type: 'notice',
          date: serverTimestamp(),
        });
      }

      resetModal();
      fetchNotices();
    } catch (e) {
      Alert.alert('저장 실패', '공지사항 저장 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    Alert.alert('삭제 확인', '정말로 이 공지사항을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'notice', id));
            fetchNotices();
          } catch (e) {
            Alert.alert('삭제 실패', '공지사항 삭제 중 오류가 발생했습니다.');
            console.error(e);
          }
        },
      },
    ]);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('링크 열기 오류:', err));
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top : insets.top,
      }}>
      {/* ✅ 상단 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
          시광 광고
        </Text>

        {user?.role === '교역자' || user?.role === '관리자' ? (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name='add' size={26} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {/* ✅ 공지사항 목록 */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {notices.length > 0 ? (
            notices.map((item) => {
              const formattedDate = item.date?.seconds
                ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                : '';

              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text
                      style={{
                        backgroundColor: '#E3F2FD',
                        color: '#1976D2',
                        fontSize: 11,
                        fontWeight: 'bold',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginRight: 6,
                      }}>
                      광고
                    </Text>
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
                    <Text style={{ fontSize: 12, color: colors.subtext }}>{formattedDate}</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: 'bold',
                      color: colors.text,
                      marginBottom: 4,
                    }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.subtext, marginBottom: 6 }}>
                    {item.content}
                  </Text>

                  {/* ✅ 링크 미리보기 */}
                  {item.link && (
                    <TouchableOpacity onPress={() => item.link && openLink(item.link)}>
                      <Text style={{ color: colors.primary, marginBottom: 8 }}>🔗 {item.link}</Text>
                    </TouchableOpacity>
                  )}

                  {/* ✅ 수정/삭제 버튼 */}
                  {(user?.role === '교역자' || user?.role === '관리자') && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                      <TouchableOpacity onPress={() => openEditModal(item)}>
                        <Text style={{ color: colors.primary, fontSize: 13 }}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteNotice(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 13 }}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.subtext, textAlign: 'center' }}>공지사항이 없습니다.</Text>
          )}
        </ScrollView>
      )}

      {/* ✅ 공지사항 추가/수정 모달 */}
      <Modal
        visible={modalVisible}
        animationType='slide'
        transparent={false}
        onRequestClose={resetModal}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}>
                <Text
                  style={{
                    fontSize: font.heading,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}>
                  {editMode ? '✏️ 공지사항 수정' : '📝 공지사항 작성'}
                </Text>
                <TouchableOpacity onPress={resetModal}>
                  <Ionicons name='close' size={26} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, padding: spacing.lg }}>
                <CustomDropdown
                  data={campusOptions}
                  value={campus}
                  onChange={(item) => setCampus(item.value)}
                  placeholder='캠퍼스 선택'
                  containerStyle={{ marginBottom: spacing.md }}
                />
                <TextInput
                  placeholder='공지 제목을 입력하세요'
                  placeholderTextColor={colors.placeholder}
                  value={title}
                  onChangeText={setTitle}
                  style={{
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: spacing.md,
                    fontSize: font.body,
                    marginBottom: spacing.md,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
                <TextInput
                  placeholder='공지 내용을 입력하세요'
                  placeholderTextColor={colors.placeholder}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical='top'
                  style={{
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: spacing.md,
                    fontSize: font.body,
                    minHeight: 180,
                    marginBottom: spacing.md,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
                <TextInput
                  placeholder='첨부 링크(URL)를 입력하세요'
                  placeholderTextColor={colors.placeholder}
                  value={link}
                  onChangeText={setLink}
                  style={{
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: spacing.md,
                    fontSize: font.body,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />

                {/* ✅ 미리보기 표시 */}
                {linkPreview && (
                  <View
                    style={{
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: spacing.sm,
                      marginTop: spacing.md,
                      backgroundColor: colors.surface,
                    }}>
                    {linkPreview.images?.[0] && (
                      <Image
                        source={{ uri: linkPreview.images[0] }}
                        style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 8 }}
                        resizeMode='cover'
                      />
                    )}
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: colors.text,
                        marginBottom: 4,
                      }}>
                      {linkPreview.title}
                    </Text>
                    <Text style={{ color: colors.subtext }}>{linkPreview.description}</Text>
                  </View>
                )}
              </View>

              <View style={{ padding: spacing.lg }}>
                <TouchableOpacity
                  onPress={handleSaveNotice}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                    {editMode ? '수정 완료' : '작성 완료'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
