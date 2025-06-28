import { useDesign } from "@/context/DesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import styled from "styled-components/native";

type SettingIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
};

type SettingCardProps = PropsWithChildren & {
  title: string;
  icon: SettingIconProps;
  onPress?: () => void;
};

const SettingCard = ({ title, icon, onPress, children }: SettingCardProps) => {
  const { name, color, backgroundColor } = icon;
  const { colors } = useDesign();

  return (
    <CardContainer
      onPress={onPress}
      backgroundColor={colors.surface}
      style={{ shadowOffset: { width: 0, height: 2 } }}
    >
      <SettingTitleSection>
        <SettingIconWrapper backgroundColor={backgroundColor}>
          <Ionicons name={name} size={20} color={color} />
        </SettingIconWrapper>
        <SettingTitle>{title}</SettingTitle>
      </SettingTitleSection>
      {children || (
        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
      )}
    </CardContainer>
  );
};

export default SettingCard;

type CardContainerProps = {
  backgroundColor: string;
};

const CardContainer = styled.TouchableOpacity<CardContainerProps>`
  background-color: ${({ backgroundColor }: CardContainerProps) =>
    backgroundColor};
  padding: 20px;
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 6;
  elevation: 2;
`;

const SettingTitleSection = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

type SettingIconWrapperProps = {
  backgroundColor: string;
};

const SettingIconWrapper = styled.View<SettingIconWrapperProps>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ backgroundColor }: SettingIconWrapperProps) =>
    backgroundColor};
  align-items: center;
  justify-content: center;
`;

const SettingTitle = styled.Text`
  font-size: 16px;
`;
