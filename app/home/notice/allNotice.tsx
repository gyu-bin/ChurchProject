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

  const [campusFilter, setCampusFilter] = useState('전체');
  const filteredNotices =
    campusFilter === '전체'
      ? notices
      : notices.filter((n) => n.campus?.trim().toLowerCase() === campusFilter.trim().toLowerCase());
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter((item) => item !== id)); // 접기
    } else {
      setExpandedIds([...expandedIds, id]); // 펼치기
    }
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

        <Text
          style={{
            position: 'absolute', // ✅ 절대 위치
            left: '50%',
            transform: [{ translateX: -30 }], // ✅ 가운데 정렬
            fontSize: font.heading,
            fontWeight: 'bold',
            color: colors.text,
          }}>
          시광 광고
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* ✅ 현재 필터 상태 표시 */}
          <View
            style={{
              alignItems: 'center', // ✅ 모든 요소 중앙 정렬
              justifyContent: 'center',
            }}>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.8}
              style={{
                alignItems: 'center', // ✅ 세로 정렬
                justifyContent: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: campusFilter === '전체' ? colors.surface : colors.primary + '22',
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}>
              {/* ✅ 위에 아이콘 */}
              <Ionicons
                name='filter'
                size={20}
                color={campusFilter === '전체' ? colors.subtext : colors.primary}
                style={{ marginBottom: 4 }}
              />
            </TouchableOpacity>
            {/* ✅ 아래에 상태 텍스트 */}
            <Text
              style={{
                fontSize: 13,
                color: campusFilter === '전체' ? colors.subtext : colors.primary,
                fontWeight: '500',
              }}>
              {campusFilter === '전체' ? '모든 캠퍼스' : campusFilter}
            </Text>
          </View>

          {/* ✅ 추가 버튼 */}
          {user?.role === '교역자' || user?.role === '관리자' ? (
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Ionicons name='add' size={26} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
      </View>

      {/* ✅ 공지사항 목록 */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {filteredNotices.length > 0 ? (
            filteredNotices.map((item) => {
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
                    borderColor: '#b9b8b8',
                    borderWidth: 1,
                    position: 'relative', // ✅ 상단 버튼 위치 위해
                  }}>
                  {/* ✅ 우측 상단 수정/삭제 */}
                  {(user?.role === '교역자' || user?.role === '관리자') && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        flexDirection: 'row',
                        gap: 10,
                      }}>
                      <TouchableOpacity onPress={() => openEditModal(item)}>
                        <Text style={{ color: colors.primary, fontSize: 13 }}>✏️ </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteNotice(item.id)}>
                        <Text style={{ color: colors.error, fontSize: 13 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ✅ 상단 배지 */}
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

                  {/* ✅ 제목 */}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: 'bold',
                      color: colors.text,
                      marginBottom: 4,
                    }}>
                    {item.title}
                  </Text>

                  {/* ✅ 내용 */}
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.subtext,
                    }}
                    numberOfLines={expandedIds.includes(item.id) ? undefined : 10}>
                    {item.content}
                  </Text>

                  {/* ✅ 링크 미리보기 */}
                  {item.link && (
                    <TouchableOpacity onPress={() => item.link && openLink(item.link)}>
                      <Text style={{ color: colors.primary, marginTop: 8 }}>🔗 {item.link}</Text>
                    </TouchableOpacity>
                  )}

                  {/* ✅ 접기/펼치기 버튼 (박스 하단 중앙) */}
                  <TouchableOpacity onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
                    <Text
                      style={{
                        textAlign: 'center',
                        color: colors.text,
                        paddingTop: 12,
                        fontSize: 14,
                      }}>
                      {expandedIds.includes(item.id) ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
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

      <Modal
        visible={filterModalVisible}
        animationType='slide'
        transparent
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.3)', // 반투명 배경
              justifyContent: 'flex-end',
            }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 10,
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: font.heading,
                    fontWeight: '600',
                    marginBottom: spacing.md,
                    color: colors.text,
                  }}>
                  캠퍼스 선택
                </Text>

                {['전체', ...campusOptions.map((o) => o.label)].map((campusName, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setCampusFilter(campusName); // ✅ 필터 값 설정
                      setFilterModalVisible(false); // ✅ 모달 닫기
                    }}
                    style={{
                      paddingVertical: spacing.md,
                      borderBottomWidth: index !== campusOptions.length ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}>
                    <Text
                      style={{
                        textAlign: 'center',
                        fontSize: font.body,
                        color: colors.text,
                      }}>
                      {campusName}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  style={{
                    marginTop: spacing.md,
                    paddingVertical: spacing.md,
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                  }}>
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: font.body,
                      color: '#fff',
                      fontWeight: 'bold',
                    }}>
                    취소
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
