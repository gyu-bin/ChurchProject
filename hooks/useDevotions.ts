import { db } from '@/firebase/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

// 묵상 목록 조회
export function useDevotions({ date, authorName }: { date?: Date | null; authorName?: string | null }) {
  return useQuery({
    queryKey: ['devotions', date?.toISOString(), authorName],
    queryFn: async () => {
      const devotionsRef = collection(db, 'devotions');
      
      let conditions = [];
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        conditions.push(where('createdAt', '>=', startOfDay));
        conditions.push(where('createdAt', '<=', endOfDay));
      }
      
      if (authorName) {
        conditions.push(where('authorName', '==', authorName));
      }
      
      conditions.push(orderBy('createdAt', 'desc'));
      
      const q = query(devotionsRef, ...conditions);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    initialData: [],
  });
}

// 묵상 추가
export function useAddDevotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      await addDoc(collection(db, 'devotions'), {
        ...data,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
}

// 묵상 수정
export function useUpdateDevotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await updateDoc(doc(db, 'devotions', id), { 
        content,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
}

// 묵상 삭제
export function useDeleteDevotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'devotions', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
} 