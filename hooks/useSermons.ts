import { db } from '@/firebase/config';
import { useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { useFirestoreAddDoc } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 설교 질문 무한스크롤 목록 조회
export const useInfiniteSermonQuestions = (pageSize: number = 10) => {
  return useInfiniteQuery<{ items: any[]; lastDoc: any }, Error>({
    queryKey: queryKeys.sermons.list(),
    queryFn: async ({ pageParam }) => {
      let q = query(
        collection(db, 'sermon_questions'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      if (pageParam) {
        q = query(
          collection(db, 'sermon_questions'),
          orderBy('createdAt', 'desc'),
          startAfter(pageParam),
          limit(pageSize)
        );
      }
      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const last = snap.docs[snap.docs.length - 1];
      return { items, lastDoc: last };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items || lastPage.items.length === 0) return undefined;
      return lastPage.lastDoc;
    },
    initialPageParam: null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// 설교 질문 추가
export const useAddSermonQuestion = () => {
  return useFirestoreAddDoc(
    'sermon_questions',
    [queryKeys.sermons.list() as unknown as unknown[], queryKeys.sermons.all as unknown as unknown[]]
  );
}; 