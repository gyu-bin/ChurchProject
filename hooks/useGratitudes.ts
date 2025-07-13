import { useFirestoreAddDoc, useFirestoreCollection, useFirestoreDeleteDoc, useFirestoreUpdateDoc } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

export const useGratitudes = () => {
  return useFirestoreCollection(
    'gratitudes',
    queryKeys.gratitudes.list(),
    {
      orderBy: [['createdAt', 'desc']],
      staleTime: 2 * 60 * 1000, // 2분
    }
  );
};

export const useAddGratitude = () => {
  return useFirestoreAddDoc(
    'gratitudes',
    [queryKeys.gratitudes.list() as unknown as unknown[], queryKeys.gratitudes.all as unknown as unknown[]]
  );
};

export const useUpdateGratitude = () => {
  return useFirestoreUpdateDoc(
    'gratitudes',
    [queryKeys.gratitudes.list() as unknown as unknown[], queryKeys.gratitudes.all as unknown as unknown[]]
  );
};

export const useDeleteGratitude = () => {
  return useFirestoreDeleteDoc(
    'gratitudes',
    [queryKeys.gratitudes.list() as unknown as unknown[], queryKeys.gratitudes.all as unknown as unknown[]]
  );
}; 