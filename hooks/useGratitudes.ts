import {
  useFirestoreAddDoc,
  useFirestoreCollection,
  useFirestoreDeleteDoc,
  useFirestoreUpdateDoc,
} from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

export const useGratitudes = (filterDate: Date) => {
  const start = new Date(filterDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(filterDate);
  end.setHours(23, 59, 59, 999);

  return useFirestoreCollection(
    'gratitudes',
    queryKeys.gratitudes.list(filterDate), // 캐시키에 날짜 포함
    {
      where: [
        ['createdAt', '>=', start],
        ['createdAt', '<=', end],
      ],
      orderBy: [['createdAt', 'desc']],
      staleTime: 2 * 60 * 1000, // 2분
    }
  );
};

export const useAddGratitude = () => {
  return useFirestoreAddDoc('gratitudes', [
    queryKeys.gratitudes.list() as unknown as unknown[],
    queryKeys.gratitudes.all as unknown as unknown[],
  ]);
};

export const useUpdateGratitude = () => {
  return useFirestoreUpdateDoc('gratitudes', [
    queryKeys.gratitudes.list() as unknown as unknown[],
    queryKeys.gratitudes.all as unknown as unknown[],
  ]);
};

export const useDeleteGratitude = () => {
  return useFirestoreDeleteDoc('gratitudes', [
    queryKeys.gratitudes.list() as unknown as unknown[],
    queryKeys.gratitudes.all as unknown as unknown[],
  ]);
};
