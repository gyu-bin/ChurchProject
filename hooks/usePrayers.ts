import type { Prayer } from '@/types/prayer';
import { useFirestoreAddDoc, useFirestoreCollection, useFirestoreDeleteDoc } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 기도 목록 조회
export const usePrayers = (visibility: 'all' | 'private' = 'all') => {
  return useFirestoreCollection<Prayer>(
    'prayer_requests',
    queryKeys.prayers.list(),
    {
      where: [['visibility', '==', visibility]],
      orderBy: [['createdAt', 'desc']],
      staleTime: 2 * 60 * 1000, // 2분
    }
  );
};

// 사용자별 기도 목록
export const useUserPrayers = (userEmail: string) => {
  return useFirestoreCollection<Prayer>(
    'prayer_requests',
    queryKeys.prayers.userPrayers(userEmail),
    {
      where: [['email', '==', userEmail]],
      orderBy: [['createdAt', 'desc']],
      staleTime: 2 * 60 * 1000, // 2분
    }
  );
};

// 기도 추가
export const useAddPrayer = () => {
  return useFirestoreAddDoc<Prayer>(
    'prayer_requests',
    [queryKeys.prayers.list() as unknown as unknown[], queryKeys.prayers.all as unknown as unknown[]]
  );
};

// 기도 삭제
export const useDeletePrayer = () => {
  return useFirestoreDeleteDoc(
    'prayer_requests',
    [queryKeys.prayers.list() as unknown as unknown[], queryKeys.prayers.all as unknown as unknown[]]
  );
}; 