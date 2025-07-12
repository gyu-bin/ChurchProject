import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomDropdown from '@/components/dropDown'; // ✅ 추가

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

type EditTeamModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (updated: {
    isClosed: boolean;
    category: string;
    expirationDate: Date;
  }) => void | Promise<void>;
  imageURLs: { uri: string }[];
  pickImage: () => void;
  editName: string;
  setEditName: (text: string) => void;
  editDescription: string;
  setEditDescription: (text: string) => void;
  openContact: string;
  setOpenContact: (text: string) => void;
  announcement: string;
  setAnnouncement: (text: string) => void;
  editCapacity: string;
  setEditCapacity: (text: string) => void;
  isUnlimited: boolean;
  setIsUnlimited: (value: boolean) => void;
  category: string;
  setCategory: (value: string) => void;
  isClosed: boolean;
  setIsClosed: (value: boolean) => void;
  expirationDate: Date;
  setExpirationDate: (date: Date) => void;
  colors: {
    surface: string;
    text: string;
    border: string;
    primary: string;
    subtext: string;
  };
  spacing: {
    sm: number;
    md: number;
    lg: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
};

const EditTeamModal = ({
  visible,
  onClose,
  onSave,
  imageURLs,
  pickImage,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  openContact,
  setOpenContact,
  announcement,
  setAnnouncement,
  editCapacity,
  setEditCapacity,
  isUnlimited,
  setIsUnlimited,
  category,
  setCategory,
  isClosed,
  setIsClosed,
  expirationDate,
  setExpirationDate,
  colors,
  spacing,
  radius,
}: EditTeamModalProps) => {
  const [localIsClosed, setLocalIsClosed] = useState(isClosed);
  const [localCategory, setLocalCategory] = useState(category);
  const [localExpirationDate, setLocalExpirationDate] = useState(expirationDate);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  useEffect(() => {
    if (visible) {
      setLocalIsClosed(isClosed);
      setLocalCategory(category);
      setLocalExpirationDate(expirationDate);
    }
  }, [visible, category, expirationDate, isClosed]);

  const handleSave = () => {
    setIsClosed(localIsClosed);
    setCategory(localCategory);
    setExpirationDate(localExpirationDate);
    onSave({
      isClosed: localIsClosed,
      category: localCategory,
      expirationDate: localExpirationDate,
    });
  };

  const AppleSheet = ({ children }: { children: React.ReactNode }) => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 8,
        elevation: 6,
        minHeight: '65%',
      }}>
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#ccc',
          }}
        />
      </View>
      {children}
    </KeyboardAvoidingView>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType='slide'
        onRequestClose={onClose}
        statusBarTranslucent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.lg,
                paddingTop: spacing.md,
                // paddingBottom: insets.bottom + spacing.md,
                height: '92%',
                minHeight: '80%',
                maxHeight: '100%',
              }}>
              {/* 드래그 핸들 */}
              <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: '#ccc',
                    opacity: 0.8,
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                  모임 수정
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name='close' size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps='handled'>
                {/* 썸네일 */}
                <TouchableOpacity onPress={pickImage} style={{ marginBottom: spacing.md }}>
                  {imageURLs.length ? (
                    <Image
                      source={{ uri: imageURLs[0].uri }}
                      style={{ width: '100%', height: 130, borderRadius: radius.md }}
                    />
                  ) : (
                    <View
                      style={{
                        height: 180,
                        borderRadius: radius.md,
                        backgroundColor: '#f0f0f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name='image-outline' size={48} color={colors.subtext} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* 입력 필드 */}
                {[
                  { label: '모임명', value: editName, onChangeText: setEditName },
                  {
                    label: '모임 소개',
                    value: editDescription,
                    onChangeText: setEditDescription,
                    multiline: true,
                  },
                  {
                    label: '오픈카톡/연락처',
                    value: openContact,
                    onChangeText: setOpenContact,
                    multiline: true,
                  },
                  {
                    label: '공지사항',
                    value: announcement,
                    onChangeText: setAnnouncement,
                    multiline: true,
                  },
                ].map((item, idx) => (
                  <View key={idx} style={{ marginBottom: spacing.md }}>
                    <Text style={{ color: colors.text, marginBottom: 4 }}>{item.label}</Text>
                    <TextInput
                      value={item.value}
                      onChangeText={item.onChangeText}
                      multiline={item.multiline}
                      placeholder={`${item.label} 입력`}
                      placeholderTextColor={colors.subtext}
                      style={{
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.sm,
                        padding: spacing.md,
                        backgroundColor: '#f9f9f9',
                        color: colors.text,
                      }}
                    />
                  </View>
                ))}

                {/* 카테고리 선택 드롭다운 */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text, marginBottom: 4 }}>카테고리</Text>

                  {/* 카테고리 선택 버튼 */}
                  <TouchableOpacity
                    onPress={() => setCategoryModalVisible(true)}
                    style={{
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      padding: spacing.md,
                      backgroundColor: '#f9f9f9',
                    }}>
                    <Text style={{ color: colors.text }}>
                      {localCategory || '카테고리를 선택하세요'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 카테고리 선택 모달 */}
                <Modal
                  visible={categoryModalVisible}
                  transparent
                  animationType='fade'
                  onRequestClose={() => setCategoryModalVisible(false)}>
                  <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                      }}>
                      <View
                        style={{
                          marginHorizontal: 20,
                          backgroundColor: colors.surface,
                          borderRadius: 12,
                          padding: spacing.lg,
                        }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: 12,
                          }}>
                          카테고리 선택
                        </Text>

                        {categories.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              setLocalCategory(item.value);
                              setCategory(item.value);
                              setCategoryModalVisible(false);
                            }}
                            style={{
                              paddingVertical: spacing.md,
                              borderBottomWidth: index !== categories.length - 1 ? 1 : 0,
                              borderBottomColor: colors.border,
                            }}>
                            <Text style={{ color: colors.text, fontSize: 16 }}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                          onPress={() => setCategoryModalVisible(false)}
                          style={{
                            marginTop: spacing.md,
                            paddingVertical: spacing.md,
                            backgroundColor: colors.primary,
                            borderRadius: radius.sm,
                            alignItems: 'center',
                          }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>취소</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
                {/*<View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text, marginBottom: 4 }}>카테고리</Text>
                  <CustomDropdown
                    data={categories}
                    value={localCategory} // ✅ 기존 카테고리 객체
                    onChange={(item) => {
                      setLocalCategory(item.value); // ✅ 로컬 state
                      setCategory(item.value); // ✅ 부모 state
                    }}
                    dropdownPosition='top'
                    placeholder='카테고리를 선택하세요'
                  />
                </View>*/}

                {/* 날짜 선택 */}
                {localCategory === '✨ 반짝소모임' && (
                  <TouchableOpacity
                    onPress={() => setCalendarModalVisible(true)}
                    style={{
                      backgroundColor: '#f5f5f7',
                      padding: spacing.md,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      marginBottom: spacing.md,
                    }}>
                    <Text style={{ color: colors.text }}>
                      종료 날짜: {localExpirationDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 인원수 입력 */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text, marginBottom: 4 }}>모임 최대 인원</Text>
                  <TextInput
                    value={editCapacity}
                    onChangeText={setEditCapacity}
                    placeholder='최대 인원 입력'
                    placeholderTextColor={colors.subtext}
                    keyboardType='number-pad'
                    editable={!isUnlimited} // 제한 없으면 비활성화
                    style={{
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      padding: spacing.md,
                      backgroundColor: isUnlimited ? '#e0e0e0' : '#f9f9f9',
                      color: colors.text,
                    }}
                  />
                </View>

                {/* 인원 제한 없음 스위치 */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.md,
                  }}>
                  <Text style={{ color: colors.text }}>인원 제한 없음</Text>
                  <Switch
                    value={isUnlimited}
                    onValueChange={setIsUnlimited}
                    trackColor={{ false: '#ccc', true: colors.primary + '88' }}
                    thumbColor={isUnlimited ? colors.primary : '#f4f3f4'}
                  />
                </View>

                {/* 모임 마감 */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    // marginVertical: spacing.sm,
                  }}>
                  <Text style={{ color: colors.text }}>모임 마감</Text>
                  <Switch
                    value={localIsClosed}
                    onValueChange={setLocalIsClosed}
                    trackColor={{ false: '#ccc', true: colors.primary + '88' }}
                    thumbColor={localIsClosed ? colors.primary : '#f4f3f4'}
                  />
                </View>

                {/* 저장 버튼 */}
                <TouchableOpacity
                  onPress={handleSave}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    marginTop: spacing.sm,
                    marginBottom: insets.bottom + spacing.lg,
                  }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 날짜 캘린더 모달 */}
      <Modal visible={calendarModalVisible} transparent animationType='slide'>
        <TouchableWithoutFeedback onPress={() => setCalendarModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <AppleSheet>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
                종료 날짜 선택
              </Text>
              <Calendar
                onDayPress={(day) => {
                  setLocalExpirationDate(new Date(day.dateString));
                  setCalendarModalVisible(false);
                }}
                markedDates={{
                  [localExpirationDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: colors.primary,
                  },
                }}
              />
            </AppleSheet>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default EditTeamModal;
