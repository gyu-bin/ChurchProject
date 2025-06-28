import { useDesign } from "@/context/DesignSystem";
import { PropsWithChildren } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";

type MyScreenContainerProps = PropsWithChildren & {
  scrollRef: React.RefObject<ScrollView | null>;
};

/**
 * 우선은 마이페이지쪽에서 사용하다 추후 공통으로 사용될 수 있다.
 */
export default function MyScreenContainer({
  children,
  scrollRef,
}: MyScreenContainerProps) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();

  return (
    <StyledSafeAreaView
      backgroundColor={colors.background}
      paddingTop={Platform.OS === "android" ? insets.top + 10 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </StyledSafeAreaView>
  );
}

type Props = {
  backgroundColor: string;
  paddingTop: number;
};

const StyledSafeAreaView = styled.SafeAreaView<Props>`
  flex: 1;
  background-color: ${({ backgroundColor }: Props) => backgroundColor};
  padding-top: ${({ paddingTop }: Props) => paddingTop}px;
`;
