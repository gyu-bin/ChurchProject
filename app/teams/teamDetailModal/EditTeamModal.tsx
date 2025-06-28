import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {collection, deleteDoc, doc, getDocs, updateDoc} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import { ImagePickerAsset } from 'expo-image-picker';
import { db, storage } from '@/firebase/config';
import Toast from 'react-native-root-toast';
import LottieView from 'lottie-react-native';
import { useDesign } from '@/context/DesignSystem';
import { showToast } from '@/utils/toast';
import {sendPushNotification} from "@/services/notificationService";

type Team = {
  id: string;
  name: string;
  description?: string;
  announcement?: string;
  maxMembers?: number;
  membersList?: string[];
  category?: string;
  scheduleDate?: string;
  expirationDate?: any;
  thumbnail?: string;
  isClosed?: boolean;
  [key: string]: any;
};

type EditTeamModalProps = {
  team: Team | null;
  visible: boolean;
  onClose: () => void;
  fetchTeam: () => void;
  loadingAnimation: any;
};

const EditTeamModal: React.FC<EditTeamModalProps> = ({
  team,
  visible,
  onClose,
  fetchTeam,
  loadingAnimation
}) => {
  const { colors, font, spacing, radius } = useDesign();
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [category, setCategory] = useState('');
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [imageURLs, setImageURLs] = useState<ImagePickerAsset[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSparkleModalVisible, setSparkleModalVisible] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const categories = [
    { label: '✨ 반짝소모임', value: '반짝소모임' },
    { label: '🏃 운동/스포츠', value: '운동/스포츠' },
    { label: '📚 책모임', value: '책모임' },
    { label: '🎮 게임', value: '게임' },
    { label: '🎭 문화생활', value: '문화생활' },
    { label: '🤝 봉사', value: '봉사' },
    { label: '📖 스터디', value: '스터디' },
    { label: '🐾 동물', value: '동물' },
    { label: '🍳 요리/제조', value: '요리/제조' },
  ];

  const [editCategory, setEditCategory] = useState(team?.category || '');

  // 데이터 초기화
  useEffect(() => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description || '');
      setAnnouncement(team.announcement || '');
      if (team.maxMembers === null || team.maxMembers === undefined || team.maxMembers === -1) {
        setIsUnlimited(true);
        setEditCapacity('');
      } else {
        setIsUnlimited(false);
        setEditCapacity(String(team.maxMembers));
      }
      setCategory(team.category || '');
      setIsClosed(team.isClosed ?? false);
      setScheduleDate(team.scheduleDate || '');

      if (team.expirationDate) {
        const parsedDate =
          team.expirationDate instanceof Date
            ? team.expirationDate
            : team.expirationDate.toDate?.() || new Date(team.expirationDate);
        setExpirationDate(parsedDate);
      }

      if (team.thumbnail) {
        const uri = team.thumbnail;
        setImageURLs([{ uri } as ImagePickerAsset]);
        setSelectedThumbnail(uri);
      } else {
        setImageURLs([]);
        setSelectedThumbnail(null);
      }
    }
  }, [team, visible]);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // 이미지 선택 함수
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '이미지 라이브러리에 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selected = result.assets[0];
      setImageURLs([selected]);
    }
  };

  // 이미지 업로드 함수
  const uploadImageToFirebase = async (imageUri: string, oldPath?: string): Promise<{ downloadUrl: string; path: string }> => {
    try {
      if (oldPath) {
        try {
          await deleteObject(ref(storage, oldPath));
          console.log('🧹 기존 이미지 삭제 완료');
        } catch (err) {
          console.warn('⚠️ 기존 이미지 삭제 실패 (무시):', err);
        }
      }

      const manipulated = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();

      const newPath = `uploads/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const storageRef = ref(storage, newPath);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });

      const downloadUrl = await getDownloadURL(storageRef);
      return { downloadUrl, path: newPath };
    } catch (err) {
      console.error('🔥 업로드 실패:', err);
      throw err;
    }
  };

  // 카테고리 선택 함수
  const handleCategorySelect = (cat: { label: string; value: string }) => {
    setCategory(cat.label);
    setCategoryModalVisible(false);
    if (cat.value === '반짝소모임') {
      setSparkleModalVisible(true);
    }
  };

  // 모임 정보 업데이트 함수
  const handleUpdateTeam = async () => {
    if (!team) return;

    setUpdateLoading(true);
    const currentCount = team.membersList?.length ?? 0;
    let newMax: number | null = isUnlimited ? -1 : Number(editCapacity);

    if (!isUnlimited && (isNaN(newMax) || newMax < currentCount)) {
      setUpdateLoading(false);
      Alert.alert('유효하지 않은 최대 인원', `현재 모임 인원(${currentCount}명)보다 작을 수 없습니다.`);
      return;
    }

    try {
      let newThumbnailUrl = team.thumbnail;
      let newThumbnailPath = null;

      if (imageURLs.length > 0) {
        const oldPath = team.thumbnail?.split('uploads/')[1]; // 기존 경로 추출
        const { downloadUrl, path } = await uploadImageToFirebase(imageURLs[0].uri, `uploads/${oldPath}`);
        newThumbnailUrl = downloadUrl;
        newThumbnailPath = path;
      }

      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, {
        name: editName,
        description: editDescription,
        maxMembers: newMax,
        announcement,
        scheduleDate,
        category,
        ...(category === '✨ 반짝소모임' && { expirationDate: new Date(expirationDate) }),
        thumbnail: newThumbnailUrl,
        isClosed,
      });

      // ✅ 반짝소모임 → 푸시 알림 & 자동 삭제 예약
      if (category === '✨ 반짝소모임' && expirationDate) {
        const deletionDate = new Date(expirationDate);
        deletionDate.setDate(deletionDate.getDate() + 1);
        const timeUntilDeletion = deletionDate.getTime() - new Date().getTime();

        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'teams', team.id));
            console.log('✅ 반짝소모임 자동 삭제 완료');
          } catch (e) {
            console.error('❌ 삭제 실패:', e);
          }
        }, timeUntilDeletion);

        try {
          const snapshot = await getDocs(collection(db, 'users'));
          const sentTokens = new Set<string>();
          const pushPromises: Promise<void>[] = [];

          snapshot.docs.forEach((docSnap) => {
            const user = docSnap.data();
            const tokens: string[] = user.expoPushTokens || [];

            tokens.forEach(token => {
              if (
                  typeof token === 'string' &&
                  token.startsWith('ExponentPushToken') &&
                  !sentTokens.has(token)
              ) {
                sentTokens.add(token);
                pushPromises.push(sendPushNotification({
                  to: token,
                  title: '✨ 반짝소모임이 수정되었어요!',
                  body: `${team.leader}님의 반짝소모임 "${editName}" 확인해보세요!`,
                }));
              }
            });
          });

          await Promise.all(pushPromises);
          console.log(`✅ ${sentTokens.size}개 푸시 전송 완료`);
        } catch (err) {
          console.error('❌ 푸시 알림 실패:', err);
        }
      }

      setTimeout(() => {
        Toast.show('✅ 수정 완료', { duration: 1500 });
        fetchTeam();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('❌ 모임 정보 수정 실패:', e);
      Alert.alert('에러', '모임 수정 중 문제가 발생했습니다.');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg }}>
              {/* 썸네일 선택 */}
              <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: spacing.md }}>
                {imageURLs.length ? (
                  <Image
                    source={{ uri: imageURLs[0].uri }}
                    style={{ width: 100, height: 100, borderRadius: 12, marginBottom: 8 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 12,
                      backgroundColor: '#eee',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name="image-outline" size={40} color={colors.subtext} />
                  </View>
                )}
                <Text style={{ color: colors.primary, fontSize: font.caption }}>썸네일 선택</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>모임명</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  marginBottom: spacing.md,
                  color: colors.text,
                }}
              />

              <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>모임 소개</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  height: 100,
                  marginBottom: spacing.md,
                  color: colors.text,
                }}
              />

              <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>공지사항</Text>
              <TextInput
                value={announcement}
                onChangeText={setAnnouncement}
                multiline
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  height: 100,
                  marginBottom: spacing.md,
                  color: colors.text,
                }}
              />

              <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>최대 인원수</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <TextInput
                  value={isUnlimited ? '무제한' : editCapacity}
                  onChangeText={setEditCapacity}
                  keyboardType="number-pad"
                  editable={!isUnlimited}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    color: colors.text,
                    fontSize: font.body,
                    opacity: isUnlimited ? 0.5 : 1,
                    marginRight: 12,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setIsUnlimited(prev => !prev)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: isUnlimited ? colors.primary + '15' : 'transparent',
                  }}
                >
                  <Ionicons
                    name={isUnlimited ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isUnlimited ? colors.primary : colors.subtext}
                  />
                  <Text style={{ color: colors.text, marginLeft: 6, fontSize: font.body }}>무제한</Text>
                </TouchableOpacity>
              </View>

              <View>
                {/* 카테고리 선택 */}
                <TouchableOpacity
                  onPress={() => setCategoryModalVisible(true)}
                  style={{
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: font.body }}>
                    {category
                      ? `카테고리: ${categories.find(c => c.value === category)?.label || category}`
                      : '카테고리를 선택하세요'}
                  </Text>
                </TouchableOpacity>

                <Modal visible={isCategoryModalVisible} transparent animationType="slide">
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ width: '80%', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {categories.map(cat => (
                          <TouchableOpacity
                            key={cat.value}
                            onPress={() => handleCategorySelect(cat)}
                            style={{ width: '30%', margin: 5, alignItems: 'center' }}
                          >
                            <Text style={{ fontSize: 30, marginBottom: 5 }}>{cat.label.split(' ')[0]}</Text>
                            <Text style={{ color: colors.text, fontSize: font.body }}>{cat.label.split(' ')[1]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: spacing.md }}>
                        <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>

                {/* 날짜 선택 (반짝소모임일 때만) */}
                {category === '✨ 반짝소모임' && (
                  <TouchableOpacity
                    onPress={() => setShowCalendar(true)}
                    style={{
                      backgroundColor: colors.surface,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginBottom: spacing.md,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: font.body }}>
                      {`날짜 선택: ${expirationDate.toLocaleDateString()}`}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: font.caption }}>
                      {'선택한 날짜 다음날 모임이 삭제됩니다.'}
                    </Text>

                    {category === '✨ 반짝소모임' && (
                      <Modal visible={showCalendar} transparent animationType="fade">
                        <View style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <View style={{
                            width: '90%',
                            backgroundColor: colors.background,
                            borderRadius: radius.md,
                            padding: spacing.md,
                          }}>
                            <Calendar
                              onDayPress={(day:any) => {
                                setExpirationDate(new Date(day.dateString));
                                setShowCalendar(false);
                              }}
                              markedDates={{
                                [formatDate(expirationDate)]: {
                                  selected: true,
                                  marked: true,
                                  selectedColor: colors.primary,
                                },
                              }}
                              theme={{
                                backgroundColor: colors.background,
                                calendarBackground: colors.background,
                                textSectionTitleColor: colors.text,
                                dayTextColor: colors.text,
                                selectedDayTextColor: '#fff',
                                selectedDayBackgroundColor: colors.primary,
                                monthTextColor: colors.text,
                                arrowColor: colors.primary,
                              }}
                            />

                            <TouchableOpacity
                              onPress={() => setShowCalendar(false)}
                              style={{ marginTop: spacing.md, alignItems: 'center' }}
                            >
                              <Text style={{ color: colors.primary, fontSize: font.body }}>닫기</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Modal>
                    )}
                  </TouchableOpacity>
                )}
                <Modal visible={isSparkleModalVisible} transparent animationType="slide">
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ width: '80%', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md }}>
                      <Text style={{ color: colors.text, fontSize: font.body, marginBottom: spacing.md }}>
                        반짝 소모임은 선택한 날짜 다음날 모임이 삭제되는 번개모임입니다. 반짝 소모임 생성 시 모든 회원에게 알림이 갑니다.
                      </Text>
                      <TouchableOpacity onPress={() => setSparkleModalVisible(false)}>
                        <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>확인</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 16, color: colors.text, marginRight: 8 }}>🙅‍♂️ 모임마감</Text>
                <Switch value={isClosed} onValueChange={setIsClosed} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={{ color: colors.subtext }}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleUpdateTeam}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={updateLoading}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          {loadingAnimation && (
            <LottieView
              source={loadingAnimation}
              autoPlay
              loop
              style={{ width: 300, height: 300 }}
            />
          )}
          <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>수정 중...</Text>
        </View>
      </Modal>
    </Modal>
  );
};

export default EditTeamModal;
