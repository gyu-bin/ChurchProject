import { Campus, CAMPUS_ENUM, Department, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { isAll } from '@utils/isAll';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';

type DepartmentHeaderProps = {
  selectedCampus: Campus | 'ALL';
  selectedDept: Department | 'ALL';
  openFilter: () => void;
};

export default function DepartmentHeader({
  selectedCampus,
  selectedDept,
  openFilter,
}: DepartmentHeaderProps) {
  const { colors } = useDesign();
  const router = useRouter();

  return (
    <Container>
      <HeaderContainer>
        <Title>부서활동</Title>
        <ButtonGroup>
          <FilterButton onPress={openFilter}>
            <Ionicons name='filter' size={18} color={colors.primary} />
            <FilterButtonText>필터</FilterButtonText>
          </FilterButton>
          <AddButton onPress={() => router.push('/department/create/CreateDepartmentPostPage')}>
            <Ionicons name='add' size={24} color='#fff' />
          </AddButton>
        </ButtonGroup>
      </HeaderContainer>
      <TabContainer>
        <TabGroup>
          <TabButton isActive={isAll(selectedCampus) && isAll(selectedDept)}>
            <TabButtonText isActive={isAll(selectedCampus) && isAll(selectedDept)}>
              전체 피드
            </TabButtonText>
          </TabButton>
          {(!isAll(selectedCampus) || !isAll(selectedDept)) && (
            <ActiveTabButton>
              <ActiveTabButtonText>
                {CAMPUS_ENUM[selectedCampus]}
                {!isAll(selectedDept) ? ' · ' + DEPARTMENT_ENUM[selectedDept] : ''}
              </ActiveTabButtonText>
            </ActiveTabButton>
          )}
        </TabGroup>
      </TabContainer>
    </Container>
  );
}

const Container = styled.View``;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.lg}px
    ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-bottom-width: 0.5px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const Title = styled.Text`
  font-size: ${({ theme }) => theme.font.heading + 10}px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
`;

const ButtonGroup = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FilterButton = styled.TouchableOpacity`
  margin-right: 8px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 16px;
  padding: 7px 12px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const FilterButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: bold;
  font-size: 14px;
  margin-left: 4px;
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 18px;
  padding: 2px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
`;

const TabContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing.lg}px;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  gap: 8px;
`;

const TabGroup = styled.View`
  flex-direction: row;
  align-items: center;
`;

const TabButton = styled.View<{ isActive: boolean }>`
  background-color: ${({ theme, isActive }) =>
    isActive ? theme.colors.primary : theme.colors.background};
  border-radius: 16px;
  padding: 6px 14px;
  border-width: 1px;
  border-color: ${({ theme, isActive }) => (isActive ? theme.colors.primary : theme.colors.border)};
`;

const TabButtonText = styled.Text<{ isActive: boolean }>`
  color: ${({ theme, isActive }) => (isActive ? '#fff' : theme.colors.text)};
  font-weight: 600;
  font-size: 15px;
`;

const ActiveTabButton = styled.View`
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 16px;
  padding: 6px 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.primary};
`;

const ActiveTabButtonText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 15px;
`;
