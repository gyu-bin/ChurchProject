import { CampusWithAll, DepartmentWithAll } from '@/app/constants/CampusDivisions';
import CampusDivisionSelect from '@/components/ui/division/CampusDivisionSelect';
import DepartmentSelect from '@/components/ui/division/DepartmentSelect';
import UserInitializer from '@/components/user/UserInitializer';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import usePickImage from './uesPickImage';
import useUploadDepartmentPost from './useUploadDepartmentPost';

export default function DepartmentPostCreate() {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();

  const [selectedCampus, setSelectedCampus] = useState<CampusWithAll | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<DepartmentWithAll | null>(null);

  const [userInfo, setUserInfo] = useState<User | null>(null);

  const { imageURLs, setImageURLs, pickImage } = usePickImage();
  const [content, setContent] = useState('');

  const { uploading, error, uploadPost } = useUploadDepartmentPost({
    imageURLs,
    setImageURLs,
    selectedCampus,
    selectedDivision,
    userInfo,
    content,
    setContent,
  });

  return (
    <Container insets={insets}>
      <UserInitializer setUserInfo={setUserInfo} />

      <HeaderContainer>
        <BackButton onPress={() => router.back()}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </BackButton>
        <HeaderTitle>게시글 생성</HeaderTitle>
        <Spacer />
      </HeaderContainer>

      <SelectWrapper>
        <CampusDivisionSelect selectedCampus={selectedCampus} onCampusChange={setSelectedCampus} />
        <DepartmentSelect
          selectedCampus={selectedCampus || 'ALL'}
          selectedDepartment={selectedDivision}
          onDepartmentChange={setSelectedDivision}
        />
      </SelectWrapper>

      <ImagePickerButton onPress={pickImage}>
        <Ionicons name='camera-outline' size={20} color='#3b82f6' />
        <ImagePickerText>사진 선택 (최대 5장)</ImagePickerText>
      </ImagePickerButton>

      <FlatList
        data={imageURLs}
        keyExtractor={(item) => item.uri}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <ImageItem
            onLongPress={() =>
              Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '삭제',
                  style: 'destructive',
                  onPress: () => setImageURLs((prev) => prev.filter((img) => img.uri !== item.uri)),
                },
              ])
            }>
            <SelectedImage source={{ uri: item.uri }} />
          </ImageItem>
        )}
      />

      <ContentInput
        placeholder='내용을 입력해주세요...'
        value={content}
        onChangeText={setContent}
        multiline
      />

      <SubmitButton onPress={uploadPost} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color='#fff' />
        ) : (
          <SubmitButtonText>🚀 등록하기</SubmitButtonText>
        )}
      </SubmitButton>
    </Container>
  );
}

const Container = styled.ScrollView<{ insets: any }>`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
  padding-top: ${({ insets }) => insets.top}px;
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

const BackButton = styled.TouchableOpacity``;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: ${({ theme }) => theme.font.title}px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
`;

const Spacer = styled.View`
  width: 24px;
`;

const SelectWrapper = styled.View`
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin-bottom: 12px;
`;

const ImagePickerButton = styled.TouchableOpacity`
  background-color: #f3f4f6;
  border-width: 1px;
  border-color: #d1d5db;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: 12px;
  align-items: center;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const ImagePickerText = styled.Text`
  color: #3b82f6;
  font-weight: 600;
`;

const ImageItem = styled.TouchableOpacity``;

const SelectedImage = styled.Image`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  margin-right: 10px;
`;

const ContentInput = styled.TextInput`
  background-color: #f9fafb;
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.md}px;
  font-size: 15px;
  min-height: 120px;
  text-align-vertical: top;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

const SubmitButton = styled.TouchableOpacity<{ disabled: boolean }>`
  background-color: ${({ disabled }) => (disabled ? '#ccc' : '#2563eb')};
  padding-vertical: 14px;
  border-radius: 12px;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const SubmitButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
`;
