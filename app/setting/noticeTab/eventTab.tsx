// EventTab.tsx
import { useDesign } from '@/app/context/DesignSystem';
import { db, storage } from '@/firebase/config';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { FirebaseError } from 'firebase/app';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {getDownloadURL, ref, uploadBytes, uploadString} from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Toast from "react-native-root-toast";

export default function EventTab() {
  const { colors, spacing } = useDesign();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    startDate: '',
    endDate: '',
    bannerImage: '',
    id: '',
  });
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isSelectingStart, setIsSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [eventList, setEventList] = useState<any[]>([]);

  const getMarkedRange = (start: Date, end: Date) => {
    const range: any = {};
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      range[dateStr] = { color: colors.primary, textColor: '#fff' };
      current.setDate(current.getDate() + 1);
    }
    return range;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setForm((prev) => ({ ...prev, bannerImage: result.assets[0].uri }));
    }
  };

  const fetchBanners = async () => {
    const q = query(collection(db, 'notice'), where('type', '==', 'banner'));
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEventList(list);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBanners();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

    const uploadImageToFirebase = async (localUri: string): Promise<string> => {
        try {
            console.log('✅ 업로드 시작, 파일 URI:', localUri);

            // 📌 base64로 인코딩
            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const filename = `banners/${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);

            // 📌 base64 데이터 업로드
            await uploadString(storageRef, `data:image/jpeg;base64,${base64}`, 'data_url');

            const downloadUrl = await getDownloadURL(storageRef);
            console.log('✅ 다운로드 URL:', downloadUrl);
            return downloadUrl;
        } catch (error: any) {
            console.error('🔥 이미지 업로드 실패:', error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!form.title || !form.content || !form.startDate || !form.endDate || !form.bannerImage) {
            Alert.alert('모든 필드를 입력해주세요');
            return;
        }

        try {
            let imageUrl = form.bannerImage;

            // file:// 경로면 Firebase Storage에 업로드
            if (imageUrl.startsWith('file://')) {
                imageUrl = await uploadImageToFirebase(imageUrl);
            }

            const payload = {
                title: form.title,
                content: form.content,
                startDate: new Date(form.startDate),
                endDate: new Date(form.endDate),
                bannerImage: imageUrl,
                type: 'banner',
            };

            if (form.id) {
                await updateDoc(doc(db, 'notice', form.id), payload);
            } else {
                await addDoc(collection(db, 'notice'), payload);
            }

            setModalVisible(false);
            setForm({ title: '', content: '', startDate: '', endDate: '', bannerImage: '', id: '' });
            fetchBanners();
            Toast.show('저장되었습니다.');
        } catch (err: any) {
            console.error('❌ 저장 실패:', err.message || err);
            Alert.alert('저장 실패', err.message || '이미지 업로드 중 오류가 발생했습니다.');
        }
    };

  const renderItem = ({ item }: any) => {
    const toDateString = (timestamp: any) => {
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR');
      }
      return '';
    };

    return (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.title}</Text>
          <Text style={{ color: colors.subtext }}>
            {toDateString(item.startDate)} ~ {toDateString(item.endDate)}
          </Text>
          {item.bannerImage && (
              <Image
                  source={{ uri: item.bannerImage }}
                  style={{ width: '100%', height: 160, marginTop: 8, borderRadius: 8 }}
                  resizeMode="cover"
              />
          )}

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, marginRight: spacing.sm, borderRadius: 8 }}
                onPress={() => {
                  const start = new Date(item.startDate.seconds * 1000);
                  const end = new Date(item.endDate.seconds * 1000);
                  setForm({
                    id: item.id,
                    title: item.title,
                    content: item.content,
                    bannerImage: item.bannerImage,
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                  });
                  setTempStart(start);
                  setTempEnd(end);
                  setModalVisible(true);
                }}
            >
              <Text style={{ color: '#fff', textAlign: 'center' }}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.error, padding: spacing.sm, borderRadius: 8 }}
                onPress={async () => {
                  Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteDoc(doc(db, 'notice', item.id));
                        fetchBanners();
                      },
                    },
                  ]);
                }}
            >
              <Text style={{ color: '#fff', textAlign: 'center' }}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  };

  return (
      <>
        <FlatList
            data={eventList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={renderItem}
        />

        {!modalVisible && (
            <TouchableOpacity
                onPress={() => {
                  setForm({ title: '', content: '', bannerImage: '', startDate: '', endDate: '', id: '' });
                  setModalVisible(true);
                }}
                style={{ margin: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', textAlign: 'center' }}>이벤트 추가</Text>
            </TouchableOpacity>
        )}

        <Modal visible={modalVisible} transparent animationType="fade">
          <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000066' }}
          >
            <View style={{ width: '90%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: 12 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                    placeholder="제목"
                    value={form.title}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, title: t }))}
                    placeholderTextColor={colors.subtext} // ✅ 다크모드 대응
                    style={{
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      marginBottom: spacing.sm,
                      padding: spacing.sm,
                      color: colors.text, // ✅ 입력 텍스트 색상도 명확하게 지정
                    }}
                />
                <TextInput
                    placeholder="내용"
                    placeholderTextColor={colors.subtext} // ✅ 다크모드 대응
                    value={form.content}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, content: t }))}
                    style={{color: colors.text,borderColor: colors.border, borderWidth: 1, borderRadius: 8, marginBottom: spacing.sm, padding: spacing.sm, height: 100 }}
                    multiline
                />
                <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false); // 이벤트 모달 먼저 닫기
                      setTimeout(() => {
                        const start = form.startDate ? new Date(form.startDate) : new Date();
                        const end = form.endDate ? new Date(form.endDate) : start;
                        setTempStart(start);
                        setTempEnd(end);
                        setIsSelectingStart(true);
                        setDatePickerVisible(true); // 날짜 선택 모달 띄우기
                      }, 300);
                    }}
                    style={{ backgroundColor: colors.border, padding: spacing.sm, borderRadius: 8, marginBottom: spacing.sm }}
                >
                  <Text style={{ textAlign: 'center', color: colors.text }}>날짜 선택</Text>
                </TouchableOpacity>
                {form.startDate && form.endDate ? (
                    <Text style={{ textAlign: 'center', marginBottom: spacing.sm, color: colors.text }}>
                      {form.startDate} ~ {form.endDate}
                    </Text>
                ) : null}
                <TouchableOpacity
                    onPress={pickImage}
                    style={{ backgroundColor: colors.border, padding: spacing.sm, borderRadius: 8, marginBottom: spacing.sm }}
                >
                  <Text style={{ textAlign: 'center', color: colors.text }}>배너 이미지 선택</Text>
                </TouchableOpacity>
                {form.bannerImage !== '' && (
                    <Image source={{ uri: form.bannerImage }} style={{ width: '100%', height: 160, borderRadius: 8 }} resizeMode="cover" />
                )}
                <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                  <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={{ flex: 1, padding: spacing.sm, backgroundColor: colors.border, marginRight: spacing.sm, borderRadius: 8 }}
                  >
                    <Text style={{ textAlign: 'center', color: colors.text }}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      onPress={handleSave}
                      style={{ flex: 1, padding: spacing.sm, backgroundColor: colors.primary, borderRadius: 8 }}
                  >
                    <Text style={{ textAlign: 'center', color: '#fff' }}>저장</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={isDatePickerVisible} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ width: '90%', borderRadius: 12, backgroundColor: colors.surface, padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>날짜 선택</Text>
              <Calendar
                  markingType="period"
                  markedDates={tempStart && tempEnd ? getMarkedRange(tempStart, tempEnd) : {}}
                  current={(tempStart || new Date()).toISOString().split('T')[0]}
                  onDayPress={(day) => {
                    const selected = new Date(day.dateString);
                    if (isSelectingStart) {
                      setTempStart(selected);
                      setTempEnd(selected);
                      setIsSelectingStart(false);
                    } else {
                      if (tempStart && selected < tempStart) {
                        Alert.alert('오류', '종료일은 시작일 이후여야 합니다.');
                      } else {
                        setTempEnd(selected);
                        setIsSelectingStart(true);
                      }
                    }
                  }}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.subtext,
                    selectedDayTextColor: '#fff',
                    dayTextColor: colors.text,
                    monthTextColor: colors.text,
                    arrowColor: colors.primary,
                    textDisabledColor: '#ccc',
                    todayTextColor: colors.primary,
                  }}
              />
              <View style={{ flexDirection: 'row', marginTop: 20 }}>
                <TouchableOpacity
                    onPress={() => {
                      setIsSelectingStart(true);
                      setDatePickerVisible(false);
                      setTempStart(null);
                      setTempEnd(null);
                    }}
                    style={{ flex: 1, backgroundColor: colors.border, padding: spacing.sm, marginRight: 8, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.text }}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                      if (tempStart && tempEnd && tempEnd >= tempStart) {
                        setForm((prev) => ({
                          ...prev,
                          startDate: tempStart.toISOString().split('T')[0],
                          endDate: tempEnd.toISOString().split('T')[0],
                        }));
                        setDatePickerVisible(false);
                        setTimeout(() => {
                          setModalVisible(true); // 🔁 모달 다시 열기
                        }, 300);
                      } else {
                        Alert.alert('날짜 오류', '시작일과 종료일을 올바르게 선택해주세요.');
                      }
                    }}
                    style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
  );
}
