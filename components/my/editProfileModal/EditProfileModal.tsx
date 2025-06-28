import { useEditProfile } from "@/components/my/editProfileModal/useEditProfile";
import { User } from "@/constants/_types/user";
import { useDesign } from "@/context/DesignSystem";
import { Modal, Platform } from "react-native";
import styled from "styled-components/native";

type EditProfileModalProps = {
  show: boolean;
  onClose: () => void;
  user: User;
  handleUserUpdate: (updatedUser: User) => void;
};

export const EditProfileModal = ({
  show,
  onClose,
  user,
  handleUserUpdate,
}: EditProfileModalProps) => {
  const { colors } = useDesign();

  const { editValues, setEditValues, handleSaveProfile, handleCancelAndClose } =
    useEditProfile({ onClose, user, handleUserUpdate });

  return (
    <Modal visible={show} transparent animationType="fade">
      <ModalOverlay>
        <ModalContainer>
          <ModalTitle>프로필 수정</ModalTitle>
          {[
            { label: "이름", key: "name" },
            { label: "이메일", key: "email", disabled: true },
            { label: "부서", key: "division" },
            { label: "캠퍼스", key: "campus" },
          ].map(({ label, key, disabled }) => (
            <InputContainer key={key}>
              <InputLabel>{label}</InputLabel>
              <StyledTextInput
                placeholder={`${label} 입력`}
                value={editValues[key]}
                editable={!disabled}
                onChangeText={(text: string) =>
                  setEditValues((prev) => ({ ...prev, [key]: text }))
                }
                placeholderTextColor={colors.subtext}
                disabled={disabled}
              />
            </InputContainer>
          ))}
          <SaveButton onPress={handleSaveProfile}>
            <SaveButtonText>저장하기</SaveButtonText>
          </SaveButton>
          <CancelButton onPress={handleCancelAndClose}>
            <CancelButtonText>닫기</CancelButtonText>
          </CancelButton>
        </ModalContainer>
      </ModalOverlay>
    </Modal>
  );
};

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.View`
  width: 90%;
  background-color: ${({ theme }: { theme: any }) => theme.surface};
  border-radius: 24px;
  padding: 24px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 5;
`;

const ModalTitle = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }: { theme: any }) => theme.text};
  margin-bottom: 24px;
  text-align: center;
`;

const InputContainer = styled.View`
  margin-bottom: 16px;
`;

const InputLabel = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: any }) => theme.subtext};
  font-weight: 600;
  margin-bottom: 8px;
`;

interface StyledTextInputProps {
  disabled?: boolean;
}

const StyledTextInput = styled.TextInput<StyledTextInputProps>`
  border-width: 1px;
  border-color: ${({ theme }: { theme: any }) => theme.border};
  border-radius: 16px;
  padding-horizontal: 16px;
  padding-vertical: ${Platform.OS === "ios" ? "16px" : "12px"};
  color: ${({ theme }: { theme: any }) => theme.text};
  background-color: ${({
    theme,
    disabled,
  }: {
    theme: any;
    disabled?: boolean;
  }) => (disabled ? theme.card : theme.surface)};
  font-size: 16px;
`;

const SaveButton = styled.TouchableOpacity`
  background-color: ${({ theme }: { theme: any }) => theme.primary};
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  margin-bottom: 12px;
`;

const SaveButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: 600;
`;

const CancelButton = styled.TouchableOpacity`
  padding: 16px;
  align-items: center;
`;

const CancelButtonText = styled.Text`
  color: ${({ theme }: { theme: any }) => theme.subtext};
  font-size: 16px;
`;
