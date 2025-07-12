import { db, storage } from '@/firebase/config';
import { router } from 'expo-router';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useState } from 'react';
import { Alert } from 'react-native';

interface UseDeleteDepartmentPostProps {
  postId: string;
  imageUrls: string[];
}

export default function useDeleteDepartmentPost({
  postId,
  imageUrls,
}: UseDeleteDepartmentPostProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePost = async () => {
    // Show confirmation dialog
    Alert.alert(
      '게시글 삭제',
      '정말로 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await performDelete();
          },
        },
      ]
    );
  };

  const performDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      // Delete images from Firebase Storage
      const deleteImagePromises = imageUrls.map(async (imageUrl) => {
        try {
          // Extract the path from the URL
          const urlParts = imageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const imageRef = ref(storage, `uploads/${fileName}`);
          await deleteObject(imageRef);
        } catch (err) {
          console.warn('이미지 삭제 실패 (이미 삭제되었을 수 있음):', err);
          // Continue with deletion even if image deletion fails
        }
      });

      // Wait for all image deletions to complete
      await Promise.all(deleteImagePromises);

      // Delete the post document from Firestore
      await deleteDoc(doc(db, 'department_posts', postId));

      // Navigate back immediately after successful deletion
      router.back();
    } catch (err) {
      console.error('🚀 게시글 삭제 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      Alert.alert('삭제 실패', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  return { deleting, error, deletePost };
}
