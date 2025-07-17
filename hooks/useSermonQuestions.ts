import { db } from '@/firebase/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';

// 설교 질문 단일 조회
export function useSermonQuestion(id: string) {
  return useQuery({
    queryKey: ['sermonQuestion', id],
    queryFn: async () => {
      const docSnap = await getDocs(collection(db, 'sermon_questions'));
      const questionDoc = docSnap.docs.find(d => d.id === id);
      if (!questionDoc) throw new Error('Question not found');
      return { id: questionDoc.id, ...questionDoc.data() };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

// 설교 질문 답글 조회
export function useSermonReplies(questionId: string) {
  return useQuery({
    queryKey: ['sermonReplies', questionId],
    queryFn: async () => {
      const repliesRef = collection(db, 'sermon_questions', questionId, 'replies');
      const q = query(repliesRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!questionId,
    initialData: [],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

// 설교 질문 답글 추가
export function useAddSermonReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, content, author }: { questionId: string; content: string; author: string }) => {
      const repliesRef = collection(db, 'sermon_questions', questionId, 'replies');
      await addDoc(repliesRef, {
        content,
        author,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sermonReplies', questionId] });
    },
  });
}

// 설교 질문 답글 수정
export function useUpdateSermonReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, id, content }: { questionId: string; id: string; content: string }) => {
      const replyRef = doc(db, 'sermon_questions', questionId, 'replies', id);
      await updateDoc(replyRef, { content });
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sermonReplies', questionId] });
    },
  });
}

// 설교 질문 답글 삭제
export function useDeleteSermonReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, replyId }: { questionId: string; replyId: string }) => {
      const replyRef = doc(db, 'sermon_questions', questionId, 'replies', replyId);
      await deleteDoc(replyRef);
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sermonReplies', questionId] });
    },
  });
} 