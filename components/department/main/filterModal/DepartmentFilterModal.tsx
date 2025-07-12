import {
  CAMPUS_ENUM,
  CAMPUS_WITH_ALL,
  CampusWithAll,
  DEPARTMENT_ENUM,
  DEPARTMENT_WITH_ALL,
  DepartmentWithAll,
} from '@/app/constants/CampusDivisions';
import { useState } from 'react';
import { Modal, TouchableWithoutFeedback } from 'react-native';
import styled from 'styled-components/native';

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
      <TouchableWithoutFeedback onPress={closeModal}>
        <Container>
          <TouchableWithoutFeedback onPress={() => {}}>
            <ModalContent>
              <Title>필터</Title>
              <SectionTitle>교회</SectionTitle>
              <CampusContainer>
                {CAMPUS_WITH_ALL.map((c) => (
                  <CampusButton
                    key={c + 'campus'}
                    onPress={() => setTempCampus(c as CampusWithAll)}
                    isSelected={tempCampus === c}>
                    <CampusButtonText isSelected={tempCampus === c}>
                      {CAMPUS_ENUM[c]}
                    </CampusButtonText>
                  </CampusButton>
                ))}
              </CampusContainer>
              <SectionTitle>부서</SectionTitle>
              <DepartmentContainer>
                {DEPARTMENT_WITH_ALL.map((d) => (
                  <DepartmentButton
                    key={d + 'dept'}
                    onPress={() => setTempDept(d as DepartmentWithAll)}
                    isSelected={tempDept === d}>
                    <DepartmentButtonText isSelected={tempDept === d}>
                      {DEPARTMENT_ENUM[d]}
                    </DepartmentButtonText>
                  </DepartmentButton>
                ))}
              </DepartmentContainer>
              <ButtonContainer>
                <ResetButton onPress={resetFilter}>
                  <ResetButtonText>초기화</ResetButtonText>
                </ResetButton>
                <ApplyButton onPress={() => applyFilter({ tempCampus, tempDept })}>
                  <ApplyButtonText>적용</ApplyButtonText>
                </ApplyButton>
              </ButtonContainer>
            </ModalContent>
          </TouchableWithoutFeedback>
        </Container>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const Container = styled.View`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.18);
`;

const ModalContent = styled.View`
  background-color: ${({ theme }) => theme.colors.card};
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  padding: 24px;
  min-height: 320px;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 18px;
  color: ${({ theme }) => theme.colors.text};
`;

const SectionTitle = styled.Text`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.subtext};
  margin-bottom: 8px;
`;

const CampusContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
`;

const CampusButton = styled.TouchableOpacity<{ isSelected: boolean }>`
  padding: 7px 14px;
  border-radius: 16px;
  background-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.background};
  border-width: 1px;
  border-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-bottom: 6px;
`;

const CampusButtonText = styled.Text<{ isSelected: boolean }>`
  color: ${({ theme, isSelected }) => (isSelected ? '#fff' : theme.colors.text)};
  font-weight: bold;
  font-size: 14px;
`;

const DepartmentContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
`;

const DepartmentButton = styled.TouchableOpacity<{ isSelected: boolean }>`
  padding: 7px 14px;
  border-radius: 16px;
  background-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.background};
  border-width: 1px;
  border-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-bottom: 6px;
`;

const DepartmentButtonText = styled.Text<{ isSelected: boolean }>`
  color: ${({ theme, isSelected }) => (isSelected ? '#fff' : theme.colors.text)};
  font-weight: bold;
  font-size: 14px;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
`;

const ResetButton = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: 10px 24px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const ResetButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-weight: bold;
`;

const ApplyButton = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  padding: 10px 32px;
`;

const ApplyButtonText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
