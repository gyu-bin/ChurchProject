import {
  CAMPUS_ENUM,
  CAMPUS_WITH_ALL,
  CampusWithAll,
  DEPARTMENT_ENUM,
  DEPARTMENT_WITH_ALL,
  DepartmentWithAll,
} from '@/app/constants/CampusDivisions';
import { useDesign } from '@/context/DesignSystem';
import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

type DepartmentFilterModalProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resetFilter: () => void;
  applyFilter: ({
    tempCampus,
    tempDept,
  }: {
    tempCampus: CampusWithAll;
    tempDept: DepartmentWithAll;
  }) => void;
  selectedCampus: CampusWithAll;
  selectedDept: DepartmentWithAll;
};

export default function DepartmentFilterModal({
  isOpen,
  setIsOpen,
  resetFilter,
  applyFilter,
  selectedCampus,
  selectedDept,
}: DepartmentFilterModalProps) {
  const [tempCampus, setTempCampus] = useState(selectedCampus);
  const [tempDept, setTempDept] = useState(selectedDept);

  const { colors } = useDesign();
  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType='slide'
      transparent
      onDismiss={closeModal}
      onRequestClose={closeModal}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.18)',
        }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: 24,
            minHeight: 320,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 18,
              color: colors.text,
            }}>
            필터
          </Text>
          <Text
            style={{
              fontWeight: 'bold',
              color: colors.subtext,
              marginBottom: 8,
            }}>
            교회
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 18,
            }}>
            {CAMPUS_WITH_ALL.map((c) => (
              <TouchableOpacity
                key={c + 'campus'}
                onPress={() => setTempCampus(c as CampusWithAll)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: tempCampus === c ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: tempCampus === c ? colors.primary : colors.border,
                  marginBottom: 6,
                }}>
                <Text
                  style={{
                    color: tempCampus === c ? '#fff' : colors.text,
                    fontWeight: 'bold',
                    fontSize: 14,
                  }}>
                  {CAMPUS_ENUM[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={{
              fontWeight: 'bold',
              color: colors.subtext,
              marginBottom: 8,
            }}>
            부서
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 18,
            }}>
            {DEPARTMENT_WITH_ALL.map((d) => (
              <TouchableOpacity
                key={d + 'dept'}
                onPress={() => setTempDept(d as DepartmentWithAll)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: tempDept === d ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: tempDept === d ? colors.primary : colors.border,
                  marginBottom: 6,
                }}>
                <Text
                  style={{
                    color: tempDept === d ? '#fff' : colors.text,
                    fontWeight: 'bold',
                    fontSize: 14,
                  }}>
                  {DEPARTMENT_ENUM[d]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <TouchableOpacity
              onPress={resetFilter}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Text style={{ color: colors.subtext, fontWeight: 'bold' }}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => applyFilter({ tempCampus, tempDept })}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 32,
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
