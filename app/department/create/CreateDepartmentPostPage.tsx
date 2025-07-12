import { CampusWithAll, DepartmentWithAll } from '@/app/constants/CampusDivisions';
import ScreenContainer from '@/components/_common/ScreenContainer';
import usePickImage from '@/components/department/create/_hooks/uesPickImage';
import useDeleteDepartmentPost from '@/components/department/create/_hooks/useDeleteDepartmentPost';
import useUploadDepartmentPost from '@/components/department/create/_hooks/useUploadDepartmentPost';
import DeleteButton from '@/components/department/create/DeleteButton';
import { DepartmentPost } from '@/components/department/main/list/useGetDepartmentPost';
import CampusDivisionSelect from '@/components/ui/division/CampusDivisionSelect';
import DepartmentSelect from '@/components/ui/division/DepartmentSelect';
import UserInitializer from '@/components/user/UserInitializer';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerAsset } from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable } from 'react-native';
import styled from 'styled-components/native';

// Custom type for existing images
type ExistingImage = {
  uri: string;
  width?: number;
  height?: number;
};

export default function CreateDepartmentPostPage() {
  const { colors } = useDesign();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const isEditMode = !!postId;

  const [selectedCampus, setSelectedCampus] = useState<CampusWithAll | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<DepartmentWithAll | null>(null);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [existingPost, setExistingPost] = useState<DepartmentPost | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

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
    isEditMode,
    postId,
  });

  const { deleting, deletePost } = useDeleteDepartmentPost({
    postId: postId || '',
    imageUrls: existingPost?.imageUrls || [],
  });

  useEffect(() => {
    if (isEditMode && postId) {
      const fetchPost = async () => {
        try {
          const postDoc = await getDoc(doc(db, 'department_posts', postId));
          if (postDoc.exists()) {
            const postData = postDoc.data() as DepartmentPost;
            setExistingPost(postData);
            setContent(postData.content || '');
            setSelectedCampus(postData.campus as CampusWithAll);
            setSelectedDivision(postData.division as DepartmentWithAll);

            if (postData.imageUrls && postData.imageUrls.length > 0) {
              const existingImages: ExistingImage[] = postData.imageUrls.map((img: string) => ({
                uri: img,
                width: 800, // Default values for existing images
                height: 600,
              }));
              setImageURLs(existingImages as ImagePickerAsset[]);
            }
          } else {
            Alert.alert('오류', '게시글을 찾을 수 없습니다.');
            router.back();
          }
        } catch (error) {
          console.error('게시글 로딩 실패:', error);
          Alert.alert('오류', '게시글을 불러오는 중 오류가 발생했습니다.');
          router.back();
        } finally {
          setIsLoading(false);
        }
      };
      fetchPost();
    } else {
      setIsLoading(false);
    }
  }, [isEditMode, postId, setImageURLs]);

  // Check if user has permission to edit
  useEffect(() => {
    if (isEditMode && existingPost && userInfo) {
      if (existingPost.author.id !== userInfo.email) {
        Alert.alert('권한 없음', '본인이 작성한 게시글만 수정할 수 있습니다.');
        router.back();
      }
    }
  }, [isEditMode, existingPost, userInfo]);

  if (isLoading) {
    return (
      <ScreenContainer paddingHorizontal={20}>
        <LoadingContainer>
          <ActivityIndicator size='large' color={colors.primary} />
          <LoadingText>게시글을 불러오는 중...</LoadingText>
        </LoadingContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer paddingHorizontal={20}>
      <UserInitializer setUserInfo={setUserInfo} />

      <HeaderContainer>
        <BackButton onPress={() => router.back()}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </BackButton>
        <HeaderTitle>{isEditMode ? '게시글 수정' : '게시글 생성'}</HeaderTitle>
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

      {Boolean(imageURLs.length > 0) && (
        <ImageContainer>
          <FlatList
            data={imageURLs}
            keyExtractor={(item) => item.uri}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              marginBottom: 12,
              height: 100, // Fixed height instead of flex
            }}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() =>
                  Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () =>
                        setImageURLs((prev: ImagePickerAsset[]) =>
                          prev.filter((img) => img.uri !== item.uri)
                        ),
                    },
                  ])
                }>
                <SelectedImage source={{ uri: item.uri }} />
              </Pressable>
            )}
          />
        </ImageContainer>
      )}

      <ContentWrapper>
        <ContentInput
          placeholder='내용을 입력해주세요...'
          value={content}
          onChangeText={setContent}
          multiline
          placeholderTextColor={colors.subtext}
        />
      </ContentWrapper>

      <ButtonContainer>
        {isEditMode && (
          <DeleteButton onPress={deletePost} disabled={uploading} loading={deleting} />
        )}
        <SubmitButton onPress={uploadPost} disabled={uploading || deleting}>
          {uploading ? (
            <ActivityIndicator color='#fff' />
          ) : (
            <SubmitButtonText>{isEditMode ? '✏️ 수정하기' : '🚀 등록하기'}</SubmitButtonText>
          )}
        </SubmitButton>
      </ButtonContainer>
    </ScreenContainer>
  );
}

const ImageContainer = styled.View`
  height: 100px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text`
  margin-top: ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 16px;
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
  background-color: ${({ theme }) => theme.colors.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
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
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.md}px;
  font-size: 15px;
  min-height: 120px;
  color: ${({ theme }) => theme.colors.text};
  text-align-vertical: top;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

const ContentWrapper = styled.View`
  flex: 1;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.md}px;
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

const SubmitButton = styled.TouchableOpacity<{ disabled: boolean }>`
  flex: 1;
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
