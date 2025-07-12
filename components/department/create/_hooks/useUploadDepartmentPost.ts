import { CampusWithAll, DepartmentWithAll } from '@/app/constants/CampusDivisions';
import { User } from '@/constants/_types/user';
import { db, storage } from '@/firebase/config';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-root-toast';
import uuid from 'react-native-uuid';

type UseUploadDepartmentPostProps = {
  imageURLs: ImagePickerAsset[];
  setImageURLs: (images: ImagePickerAsset[]) => void;
  selectedCampus: CampusWithAll | null;
  selectedDivision: DepartmentWithAll | null;
  userInfo: User | null;
  content: string;
  setContent: (content: string) => void;
  isEditMode?: boolean;
  postId?: string;
};

export default function useUploadDepartmentPost({
  imageURLs,
  setImageURLs,
  selectedCampus,
  selectedDivision,
  userInfo,
  content,
  setContent,
  isEditMode = false,
  postId,
}: UseUploadDepartmentPostProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImageToFirebase = async (imageAsset: ImagePickerAsset): Promise<string> => {
    try {
      // URI가 file:// 또는 content:// 형식인지 확인
      if (!imageAsset.uri) {
        throw new Error('이미지 URI가 없습니다.');
      }

      // 이미지 조작 (크기 그대로, 포맷만 JPEG으로 확실히 지정)
      const manipulated = await ImageManipulator.manipulateAsync(imageAsset.uri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // fetch를 사용하여 blob으로 변환
      const response = await fetch(manipulated.uri);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      const filename = `uploads/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });

      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.error('🔥 에러 상세:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  };

  const uploadPost = async () => {
    if (!userInfo) {
      Alert.alert('입력 오류', '로그인 후 이용해주세요.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('입력 오류', '내용을 입력해주세요.');
      return;
    }

    if (!selectedCampus || !selectedDivision) {
      Alert.alert('입력 오류', '캠퍼스와 부서를 선택해주세요.');
      return;
    }

    if (imageURLs.length === 0) {
      Alert.alert('입력 오류', '최소 1장의 이미지를 선택해주세요.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const downloadUrls: string[] = [];

      // 이미지 업로드 (새로 추가된 이미지만)
      for (let i = 0; i < imageURLs.length; i++) {
        const image = imageURLs[i];

        // 이미 URL인 경우 (기존 이미지) 그대로 사용
        if (image.uri.startsWith('http')) {
          downloadUrls.push(image.uri);
          continue;
        }

        console.log(`🔥 이미지 ${i + 1}/${imageURLs.length} 업로드 중...`);

        try {
          const downloadUrl = await uploadImageToFirebase(image);
          downloadUrls.push(downloadUrl);
        } catch (err) {
          throw new Error(
            `이미지 ${i + 1} 업로드에 실패했습니다: ${
              err instanceof Error ? err.message : '알 수 없는 오류'
            }`
          );
        }
      }

      const postData = {
        content,
        campus: selectedCampus,
        division: selectedDivision,
        imageUrls: downloadUrls,
        author: {
          id: userInfo.email,
          name: userInfo.name,
          campus: userInfo.campus,
          division: userInfo.division,
        },
      };

      if (isEditMode && postId) {
        // Update existing post
        await updateDoc(doc(db, 'department_posts', postId), {
          ...postData,
          updatedAt: Timestamp.now(),
        });

        Toast.show('게시물이 수정되었습니다.', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        });

        router.back();
      } else {
        // Create new post
        const newPostId = uuid.v4().toString();
        await setDoc(doc(db, 'department_posts', newPostId), {
          id: newPostId,
          ...postData,
          createdAt: Timestamp.now(),
        });
        Toast.show('게시물이 등록되었습니다.', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        });
        router.back();
      }

      // 상태 초기화
      setContent('');
      setImageURLs([]);
    } catch (err) {
      console.error('🚀 게시물 업로드 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      Alert.alert('업로드 실패', errorMessage);
    }

    setUploading(false);
  };

  return { uploading, error, uploadPost };
}
