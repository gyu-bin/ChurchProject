import { db } from '@/firebase/config';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc } from 'firebase/firestore';

// 설교 나눔 무한스크롤 목록 조회
export function useInfiniteSermonShares(pageSize: number = 10) {
  return useInfiniteQuery<{ items: any[]; lastDoc: any }, Error>({
    queryKey: ['sermonShares'],
    queryFn: async ({ pageParam }) => {
      let q = query(
        collection(db, 'sermon_shares'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      if (pageParam) {
        q = query(
          collection(db, 'sermon_shares'),
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
}

// 설교 나눔 추가/수정/삭제는 기존과 동일하게 유지
export function useAddSermonShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      await addDoc(collection(db, 'sermon_shares'), {
        ...data,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermonShares'] });
    },
  });
}

export function useUpdateSermonShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      await updateDoc(doc(db, 'sermon_shares', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermonShares'] });
    },
  });
}

export function useDeleteSermonShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'sermon_shares', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermonShares'] });
    },
  });
} 