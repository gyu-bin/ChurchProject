import { useDesign } from '@/context/DesignSystem';
import { PropsWithChildren } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

type ScreenContainerProps = PropsWithChildren & {
  /**
   * 추가 시 스크롤 기능 사용 가능
   */
  scrollRef?: React.RefObject<ScrollView | null>;
  paddingHorizontal?: number;
  paddingBottom?: number;
};

/**
 * SafeAreaView 적용된 컴포넌트
 */
export default function ScreenContainer({
  children,
  scrollRef,
  paddingHorizontal = 20,
  paddingBottom = 40,
}: ScreenContainerProps) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();

  return (
    <StyledSafeAreaView
      backgroundColor={colors.background}
      paddingTop={Platform.OS === 'android' ? insets.top + 10 : 0}>
      {!scrollRef ? (
        <ContentContainer paddingHorizontal={paddingHorizontal} paddingBottom={paddingBottom}>
          {children}
        </ContentContainer>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingHorizontal,
            paddingBottom,
          }}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      )}
    </StyledSafeAreaView>
  );
}

type Props = {
  backgroundColor: string;
  paddingTop: number;
};

type ContentContainerProps = {
  paddingHorizontal: number;
  paddingBottom: number;
};

const StyledSafeAreaView = styled.SafeAreaView<Props>`
  flex: 1;
  background-color: ${({ backgroundColor }: Props) => backgroundColor};
  padding-top: ${({ paddingTop }: Props) => paddingTop}px;
`;

const ContentContainer = styled.View<ContentContainerProps>`
  flex: 1;
  padding: ${({ paddingHorizontal, paddingBottom }: ContentContainerProps) =>
    `${paddingHorizontal}px ${paddingHorizontal}px ${paddingBottom}px`};
`;
