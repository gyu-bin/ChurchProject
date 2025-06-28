import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { showToast } from '@/utils/toast';

type LocationModalProps = {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  initialLocation?: string;
  onLocationUpdate: (location: string) => void;
};

const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  teamId,
  initialLocation,
  onLocationUpdate
}) => {
  const { colors, font, spacing, radius } = useDesign();
  const [locationInput, setLocationInput] = useState(initialLocation || '');

  const [commonLocations] = useState([
    '본당',
    '카페',
  ]);

  const handleUpdateLocation = async (location: string) => {
    if (!teamId) return;

    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        location: location,
      });

      onLocationUpdate(location);
      showToast('✅ 장소가 업데이트되었습니다.');
      onClose();
      setLocationInput('');
    } catch (e) {
      console.error('❌ 장소 업데이트 실패:', e);
      showToast('⚠️ 장소 업데이트에 실패했습니다.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end'
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                maxHeight: '80%',
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}>
                  <Text style={{
                    fontSize: font.heading,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}>
                    장소 선택
                  </Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: '100%' }}
                  contentContainerStyle={{ padding: spacing.lg }}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* 직접 입력 */}
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text style={{
                      fontSize: font.body,
                      color: colors.text,
                      marginBottom: spacing.sm,
                    }}>
                      직접 입력
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TextInput
                        value={locationInput}
                        onChangeText={setLocationInput}
                        placeholder="장소를 입력하세요"
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          color: colors.text,
                          backgroundColor: colors.background,
                        }}
                        placeholderTextColor={colors.subtext}
                      />
                      <TouchableOpacity
                        onPress={() => handleUpdateLocation(locationInput)}
                        disabled={!locationInput.trim()}
                        style={{
                          backgroundColor: locationInput.trim() ? colors.primary : colors.border,
                          paddingHorizontal: spacing.lg,
                          justifyContent: 'center',
                          borderRadius: radius.sm,
                        }}
                      >
                        <Text style={{ color: '#fff' }}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 자주 사용하는 장소 */}
                  <View>
                    <Text style={{
                      fontSize: font.body,
                      color: colors.text,
                      marginBottom: spacing.sm,
                    }}>
                      자주 사용하는 장소
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: spacing.sm,
                    }}>
                      {commonLocations.map((location) => (
                        <TouchableOpacity
                          key={location}
                          onPress={() => handleUpdateLocation(location)}
                          style={{
                            backgroundColor: colors.background,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: radius.sm,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ color: colors.text }}>{location}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 추후 지도 선택 기능 추가 예정 */}
                  <TouchableOpacity
                    style={{
                      marginTop: spacing.xl,
                      marginBottom: Platform.OS === 'ios' ? spacing.xl * 2 : spacing.xl,
                      padding: spacing.md,
                      backgroundColor: colors.background,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.5,
                    }}
                  >
                    <Ionicons name="map" size={20} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={{ color: colors.text }}>지도에서 선택 (준비중)</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default LocationModal;
