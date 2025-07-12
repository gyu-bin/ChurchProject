import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

export default function DepartmentActivitiyHeader() {
  const insets = useSafeAreaInsets();

  return (
    <HeaderContainer insets={insets}>
      <BackButton onPress={() => router.back()}>
        <BackIcon name='chevron-back' size={24} />
      </BackButton>
      <HeaderTitle>게시물</HeaderTitle>
    </HeaderContainer>
  );
}

const BackIcon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.text};
`;

const HeaderContainer = styled.View<{ insets: any }>`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  padding-top: ${({ insets, theme }) => insets.top + theme.spacing.sm}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: ${({ theme }) => theme.font.title}px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
`;

const BackButton = styled.TouchableOpacity`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.md}px;
`;
