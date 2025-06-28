import { useDesign } from "@/context/DesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PropsWithChildren } from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
;

type HeaderProps = PropsWithChildren & {
  title: string;
  hasBackButton?: boolean;
};

/**
 * Header의 childern: rightComponent
 */
const ScreenHeader = ({
  title,
  hasBackButton = false,
  children,
}: HeaderProps) => {
  const { colors } = useDesign();
  const router = useRouter();

  return (
    /* 헤더 */
    <HeaderWrapper>
      {hasBackButton && (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <HeaderTitle color={colors.text}>{title}</HeaderTitle>
      {children}
    </HeaderWrapper>
  );
};

export default ScreenHeader;

const HeaderWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 32px;
  margin-top: 12px;
  gap: 8px;
`;

type HeaderTitleProps = {
  color: string;
};

const HeaderTitle = styled.Text<HeaderTitleProps>`
  flex: 1;
  font-size: 24px;
  font-weight: 700;
  color: ${({ color }: HeaderTitleProps) => color};
`;
