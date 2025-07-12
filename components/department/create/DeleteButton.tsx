import React from 'react';
import { ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';

interface DeleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function DeleteButton({ onPress, disabled = false, loading = false }: DeleteButtonProps) {
  return (
    <DeleteButtonContainer onPress={onPress} disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <DeleteButtonText>삭제</DeleteButtonText>
      )}
    </DeleteButtonContainer>
  );
}

const DeleteButtonContainer = styled.TouchableOpacity<{ disabled: boolean }>`
  background-color: ${({ theme, disabled }) => 
    disabled ? theme.colors.border : theme.colors.error};
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  align-items: center;
  justify-content: center;
  min-width: 80px;
`;

const DeleteButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
`;
