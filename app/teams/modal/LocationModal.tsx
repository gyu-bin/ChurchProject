import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '@/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useDesign } from '@/context/DesignSystem';

interface LocationModalProps {
  isVisible: boolean;
  onClose: () => void;
  teamId: string;
}

const LocationModal: React.FC<LocationModalProps> = ({ isVisible, onClose, teamId }) => {
  const insets = useSafeAreaInsets();
  const [locationInput, setLocationInput] = useState('');
  const commonLocations = ['본당', '교육관', '카페', '야외'];
  const { colors, font, spacing, radius } = useDesign();
  const handleUpdateLocation = async (location: string) => {
    if (!teamId) return;

    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, { location });
      onClose();
    } catch (error) {
      console.error('❌ 장소 업데이트 실패:', error);
    } finally {
      setLocationInput('');
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
              minHeight: '40%',
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>장소 선택</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name='close' size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* 내용 */}
            <ScrollView keyboardShouldPersistTaps='handled'>
              {/* 직접 입력 */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ color: colors.text, marginBottom: 4 }}>직접 입력</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput
                    value={locationInput}
                    onChangeText={setLocationInput}
                    placeholder='장소를 입력하세요'
                    placeholderTextColor={colors.subtext}
                    style={{
                      flex: 1,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      padding: spacing.md,
                      backgroundColor: '#f9f9f9',
                      color: colors.text,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleUpdateLocation(locationInput)}
                    disabled={!locationInput.trim()}
                    style={{
                      marginLeft: spacing.sm,
                      backgroundColor: locationInput.trim() ? colors.primary : colors.border,
                      paddingHorizontal: spacing.md,
                      justifyContent: 'center',
                      borderRadius: radius.sm,
                    }}>
                    <Text style={{ color: '#fff' }}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 자주 사용하는 장소 */}
              <Text style={{ color: colors.text, marginBottom: spacing.sm }}>
                자주 사용하는 장소
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {commonLocations.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    onPress={() => handleUpdateLocation(loc)}
                    style={{
                      backgroundColor: '#f5f5f7',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginBottom: spacing.sm,
                    }}>
                    <Text style={{ color: colors.text }}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default LocationModal;
