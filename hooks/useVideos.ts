import { useFirestoreAddDoc, useFirestoreCollection, useFirestoreDeleteDoc } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 비디오 목록 조회
export const useVideos = () => {
  return useFirestoreCollection(
    'videos',
    queryKeys.home.all,
    {
      orderBy: [['order', 'asc']],
      staleTime: 30 * 60 * 1000, // 30분
    }
  );
};

// 비디오 추가
export const useAddVideo = () => {
  return useFirestoreAddDoc(
    'videos',
    [queryKeys.home.all as unknown as unknown[]]
  );
};

// 비디오 삭제
export const useDeleteVideo = () => {
  return useFirestoreDeleteDoc(
    'videos',
    [queryKeys.home.all as unknown as unknown[]]
  );
}; 