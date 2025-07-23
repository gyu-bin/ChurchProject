import { useDesign } from '@/context/DesignSystem';
import { db, storage } from '@/firebase/config';
import { useAddTeam } from '@/hooks/useTeams';
import { sendPushNotification } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import LottieView from "lottie-react-native";
import loading4 from '@/assets/lottie/Animation - 1747201330128.json';
import loading3 from '@/assets/lottie/Animation - 1747201413764.json';
import loading2 from '@/assets/lottie/Animation - 1747201431992.json';
import loading1 from '@/assets/lottie/Animation - 1747201461030.json';
import LoadingModal from '@/components/lottieModal';
import Toast from 'react-native-root-toast';

export default function CreateTeam() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [leader, setLeader] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [isUnlimited, setIsUnlimited] = useState(false); // ✅ 무제한 상태
  const [role, setRole] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [category, setCategory] = useState('');
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSparkleModalVisible, setSparkleModalVisible] = useState(false);
  const [expirationDate, setExpirationDate] = useState(new Date());
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, font } = useDesign();
  const [imageURLs, setImageURLs] = useState<ImagePickerAsset[]>([]);

  const [showCalendar, setShowCalendar] = useState(false);

  const [updateLoading, setUpdateLoading] = useState(false); // 🔸 수정 중 로딩용
  const [loadingAnimation, setLoadingAnimation] = useState<any>(null); // 선택된 애니메이션
  // 상태 정의
  const [openContact, setOpenContact] = useState('');
  const loadingAnimations = [loading1, loading2, loading3, loading4];

  // TanStack Query mutation 훅 사용
  const addTeamMutation = useAddTeam();

  // yyyy-mm-dd 형식으로 포맷하는 함수
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const categories = [
    { label: '✨ 반짝소모임', value: '✨ 반짝소모임' },
    { label: '🏃 운동·스포츠', value: '🏃운동·스포츠' },
    { label: '📚 책모임', value: '📚 책모임' },
    { label: '🎮 게임', value: '🎮 게임' },
    { label: '🎭 문화생활', value: '🎭 문화생활' },
    { label: '📖 스터디', value: '📖 스터디' },
    { label: '🐾 동물', value: '🐾 동물' },
    { label: '🛠 제작', value: '🛠 제작' },
    { label: '🤝 봉사', value: '🤝 봉사' },
    { label: '📢 구인', value: '📢 구인' },
  ];

  useEffect(() => {
    AsyncStorage.getItem('currentUser').then((raw) => {
      if (raw) {
        const user = JSON.parse(raw);
        setLeader(user.name);
        setCreatorEmail(user.email);
        setRole(user.role);
      }
    });
  }, []);

  useEffect(() => {
    const random = Math.floor(Math.random() * loadingAnimations.length);
    setLoadingAnimation(loadingAnimations[random]);
  }, []);

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
      setImageURLs([selected]); // ✅ 하나만 선택
      // setForm(prev => ({ ...prev, bannerImage: selected.uri })); // ✅ 미리보기용 uri 저장
    }
  };

  const uploadImageToFirebase = async (imageUri: string): Promise<string> => {
    try {
      // 이미지 조작 (크기 그대로, 포맷만 JPEG으로 확실히 지정)
      const manipulated = await ImageManipulator.manipulateAsync(imageUri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();

      const filename = `uploads/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });

      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('🔥 업로드 실패:', err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('입력 오류', '모임명을 입력해주세요.');
      return;
    }

    let max: number | null = null;
    if (!isUnlimited) {
      max = parseInt(memberCount);
      if (isNaN(max) || max < 2 || max > 500) {
        Alert.alert('입력 오류', '참여 인원 수는 2명 이상 500명 이하로 설정해주세요.');
        setUpdateLoading(false);
        return;
      }
    } else {
      max = -1;
    }

    const downloadUrls: string[] = [];

    for (const image of imageURLs) {
      const downloadUrl = await uploadImageToFirebase(image.uri);
      downloadUrls.push(downloadUrl);
    }

    try {
      const baseData = {
        name,
        leader,
        leaderEmail: creatorEmail,
        description,
        membersList: [creatorEmail],
        createdAt: serverTimestamp(),
        openContact,
        maxMembers: max,
        category,
        ...(category === '✨ 반짝소모임' && expirationDate && { expirationDate }),
        ...(category === '✨ 반짝소모임' && location && { location }),
        thumbnail: downloadUrls[0],
      };

      // 1. 문서 추가 (id/teamId 없이)
      const docRef = await addTeamMutation.mutateAsync({
        ...baseData,
        approved: true,
      });
      // 2. id, teamId 필드에 문서 id를 update
      if (docRef?.id) {
        const teamDocRef = doc(db, 'teams', docRef.id);
        await updateDoc(teamDocRef, {
          id: docRef.id,
          teamId: docRef.id,
        });
      }

      // ✅ '✨ 반짝소모임'일 경우: 삭제 예약 + 푸시 알림
      if (category === '✨ 반짝소모임' && expirationDate) {
        // 🔹 삭제 예약
        const deletionDate = new Date(expirationDate);
        deletionDate.setDate(deletionDate.getDate() + 1);
        const timeUntilDeletion = deletionDate.getTime() - new Date().getTime();

        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'teams', docRef.id));
            console.log('✅ 반짝소모임 자동 삭제 완료');
          } catch (e) {
            console.error('❌ 삭제 실패:', e);
          }
        }, timeUntilDeletion);

        // 🔹 푸시 알림: 모든 Expo 토큰 대상, 중복 방지
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          const sentTokens = new Set<string>();
          const pushPromises: Promise<void>[] = [];

          snapshot.docs.forEach((docSnap) => {
            const user = docSnap.data();
            const tokens: string[] = user.expoPushTokens || [];

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
                    title: '✨ 반짝소모임 생성!',
                    body: `${leader}님의 반짝소모임 "${name}"에 참여해보세요!`,
                  })
                );
              }
            });
          });

          await Promise.all(pushPromises);
          console.log(`✅ ${sentTokens.size}개의 Expo 푸시 전송 완료`);
        } catch (err) {
          console.error('❌ 푸시 알림 실패:', err);
        }
      }
      setTimeout(() => {
        Toast.show('✅ 모임이 성공적으로 생성되었습니다.', { duration: 1500 });
        setTimeout(() => {
          setUpdateLoading(false); // 데이터 로드 후 로딩 상태 종료
        }, 500);
      }, 1500);
      if (docRef?.id) {
        router.replace(`/teams/${docRef.id}`);
      } else {
        router.replace('/teams');
      }
    } catch (error: any) {
      Alert.alert('생성 실패', error.message);
    }
  };

  const handleCategorySelect = (cat: { label: string; value: string }) => {
    setCategory(cat.label);
    setCategoryModalVisible(false);
    if (cat.value === '반짝소모임') {
      setSparkleModalVisible(true);
    }
  };

  /*    const handleDateChange = (event: any, selectedDate: Date | undefined) => {
        const currentDate = selectedDate || expirationDate;
        setShowDatePicker(Platform.OS === 'ios');
        setExpirationDate(currentDate);
    };*/

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top : 20,
      }}>
      {/* 상단 화살표 + 소모임생성 한 줄 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 20,
          paddingHorizontal: spacing.lg,
          position: 'relative',
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            left: spacing.lg,
            padding: 8,
          }}>
          <Ionicons name='arrow-back' size={24} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: font.heading,
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
          }}>
          소모임 생성
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
          <View style={{ padding: spacing.md }}>
            <Text
              style={{
                fontSize: font.title,
                fontWeight: 'bold',
                marginBottom: spacing.sm,
                color: colors.text,
              }}>
              썸네일 이미지
            </Text>

            {imageURLs.length > 0 ? (
              <Image
                source={{ uri: imageURLs[0].uri }}
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: radius.md,
                  marginBottom: spacing.sm,
                  resizeMode: 'cover',
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 10,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: font.body }}>
                  썸네일 이미지 선택하기
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            placeholder='모임명 (예: 러닝크루)'
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            style={{
              backgroundColor: colors.surface,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
              color: colors.text,
              fontSize: font.body,
            }}
          />

          <TextInput
            placeholder='모임 소개 (선택 사항)'
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.surface,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
              height: 120,
              color: colors.text,
              fontSize: font.body,
              textAlignVertical: 'top',
            }}
          />

          <TextInput
            placeholder='오픈카톡 / 연락처'
            placeholderTextColor={colors.placeholder}
            value={openContact}
            onChangeText={setOpenContact}
            style={{
              backgroundColor: colors.surface,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
              color: colors.text,
              fontSize: font.body,
            }}
          />

          {/* 최대 인원수 + 무제한 체크박스 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <TextInput
              placeholder='최대 인원 수 (예: 5)'
              keyboardType='numeric'
              value={isUnlimited ? '무제한' : memberCount}
              onChangeText={setMemberCount}
              placeholderTextColor={colors.placeholder}
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
              onPress={() => setIsUnlimited((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: isUnlimited ? colors.primary + '15' : 'transparent',
              }}>
              <Ionicons
                name={isUnlimited ? 'checkbox' : 'square-outline'}
                size={20}
                color={isUnlimited ? colors.primary : colors.subtext}
              />
              <Text
                style={{
                  color: colors.text,
                  marginLeft: 6,
                  fontSize: font.body,
                }}>
                무제한
              </Text>
            </TouchableOpacity>
          </View>

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
            }}>
            <Text style={{ color: colors.text, fontSize: font.body }}>
              {category ? `카테고리: ${category}` : '카테고리를 선택하세요'}
            </Text>
          </TouchableOpacity>

          <Modal visible={isCategoryModalVisible} transparent animationType='slide'>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}>
              <View
                style={{
                  width: '80%',
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => handleCategorySelect(cat)}
                      style={{
                        width: '30%',
                        margin: 5,
                        alignItems: 'center',
                      }}>
                      <Text style={{ fontSize: 30, marginBottom: 5 }}>
                        {cat.label.split(' ')[0]}
                      </Text>
                      <Text style={{ color: colors.text, fontSize: font.body }}>
                        {cat.label.split(' ')[1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => setCategoryModalVisible(false)}
                  style={{ marginTop: spacing.md }}>
                  <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>
                    닫기
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* 날짜 선택 (반짝소모임일 때만) */}
          {category === '✨ 반짝소모임' && (
            <>
              {/* 날짜 선택 */}
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={{
                  backgroundColor: colors.surface,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: spacing.md,
                }}>
                <Text style={{ color: colors.text, fontSize: font.body }}>
                  {`날짜 선택: ${expirationDate.toLocaleDateString()}`}
                </Text>
                <Text style={{ color: colors.text, fontSize: font.caption }}>
                  {'선택한 날짜 다음날 모임이 삭제됩니다.'}
                </Text>
              </TouchableOpacity>

              {category === '✨ 반짝소모임' && (
                <Modal visible={showCalendar} transparent animationType='fade'>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <View
                      style={{
                        width: '90%',
                        backgroundColor: colors.background,
                        borderRadius: radius.md,
                        padding: spacing.md,
                      }}>
                      <Calendar
                        onDayPress={(day: any) => {
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
                        style={{ marginTop: spacing.md, alignItems: 'center' }}>
                        <Text style={{ color: colors.primary, fontSize: font.body }}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              {/* 장소 입력 필드 */}
              <TextInput
                placeholder='모임 장소 입력 (예: 15층 본당)'
                placeholderTextColor={colors.placeholder}
                value={location}
                onChangeText={setLocation}
                style={{
                  backgroundColor: colors.surface,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: spacing.md,
                  color: colors.text,
                  fontSize: font.body,
                }}
              />
            </>
          )}

          <Modal visible={isSparkleModalVisible} transparent animationType='slide'>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}>
              <View
                style={{
                  width: '80%',
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}>
                <Text style={{ color: colors.text, fontSize: font.body, marginBottom: spacing.md }}>
                  반짝 소모임은 선택한 날짜 다음날 모임이 삭제되는 번개모임입니다. 반짝 소모임 생성
                  시 모든 회원에게 알림이 갑니다.
                </Text>

                <TouchableOpacity onPress={() => setSparkleModalVisible(false)}>
                  <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>
                    확인
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity
            onPress={() => {
              const random = Math.floor(Math.random() * loadingAnimations.length);
              setLoadingAnimation(loadingAnimations[random]);
              setUpdateLoading(true);
              handleSubmit();
            }}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
              marginTop: spacing.sm,
            }}>
            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
              소모임 생성
            </Text>
          </TouchableOpacity>

          <LoadingModal
            visible={updateLoading}
            animations={loadingAnimations}
            message='저장 중...'
            subMessage='잠시만 기다려주세요'
          />

          <Text
            style={{
              fontSize: Platform.OS === 'android' ? 12 : 14,
              color: colors.subtext,
              textAlign: 'center',
              marginTop: spacing.lg,
              lineHeight: 20,
              fontWeight: 'bold',
            }}>
            ※ 소모임은 정회원 또는 교역자만 생성할 수 있습니다.{'\n'}
            {/*※ 모임장은 정회원 이상이어야 하며, 최소 5명 이상이 모여야 합니다.{'\n'}*/}※ 생성 후
            1개월 내 인원이 없을 경우 모임이 삭제될 수 있습니다.{'\n'}※ 교회와 무관한 주제의 모임은
            임의로 삭제될 수 있습니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
