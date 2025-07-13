import { db } from '@/firebase/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';

// 설교 나눔 목록 조회 (페이지네이션)
export function useSermonShares(pageSize: number = 10) {
  return useQuery({
    queryKey: ['sermonShares', pageSize],
    queryFn: async () => {
      const sharesRef = collection(db, 'sermon_shares');
      const q = query(sharesRef, orderBy('createdAt', 'desc'), limit(pageSize));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    initialData: [],
  });
}

// 설교 나눔 추가
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

// 설교 나눔 수정
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

// 설교 나눔 삭제
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