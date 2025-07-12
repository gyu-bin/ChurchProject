import { EditProfileModal } from '@/components/my/editProfileModal/EditProfileModal';
import { User } from '@/constants/_types/user';
import React, { useState } from 'react';
import styled from 'styled-components/native';

type ProfileCardProps = {
  user: User;
  handleUserUpdate: (updatedUser: User) => void;
};

export const ProfileCard = ({ user, handleUserUpdate }: ProfileCardProps) => {
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleEditToggle = () => {
    setShowEditProfile((prev) => !prev);
  };

  return (
    <CardContainer>
      <TopRow>
        <UserInfo>
          <UserName>{user?.name ?? '이름'}</UserName>
          <UserEmail>{user?.email ?? '이메일'}</UserEmail>
        </UserInfo>
        <EditButton onPress={handleEditToggle}>
          <EditButtonText>프로필 수정</EditButtonText>
        </EditButton>
      </TopRow>
      <BadgeRow>
        {user?.division && (
          <Badge background='#E3F2FD'>
            <BadgeText color='#1976D2'>{user.division}</BadgeText>
          </Badge>
        )}
        {user?.role && (
          <Badge background='#E8F5E9'>
            <BadgeText color='#2E7D32'>{user.role}</BadgeText>
          </Badge>
        )}
        {user?.campus && (
          <Badge background='#FDECEC'>
            <BadgeText color='#ff9191'>{user.campus}</BadgeText>
          </Badge>
        )}
      </BadgeRow>
      <EditProfileModal
        show={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        handleUserUpdate={handleUserUpdate}
      />
    </CardContainer>
  );
};

// --- Styled Components ---
const CardContainer = styled.View`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 32px;
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.08;
  shadow-radius: 8px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const UserInfo = styled.View``;

const UserName = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const UserEmail = styled.Text`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.subtext};
`;

const EditButton = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.colors.primary + '15'};
  padding: 8px 12px;
  border-radius: 12px;
`;

const EditButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
`;

const BadgeRow = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const Badge = styled.View<{ background: string }>`
  background-color: ${({ background }) => background};
  padding: 6px 10px;
  border-radius: 12px;
`;

const BadgeText = styled.Text<{ color: string }>`
  color: ${({ color }) => color};
  font-size: 13px;
  font-weight: 600;
`;
