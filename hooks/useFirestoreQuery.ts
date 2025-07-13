import { db } from '@/firebase/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';

// 기본 문서 조회 훅
export const useFirestoreDoc = <T = any>(
  collectionName: string,
  docId: string,
  queryKey: readonly unknown[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Document not found: ${docId}`);
      }
      
      return { id: docSnap.id, ...docSnap.data() } as T;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5분
  });
};

// 컬렉션 조회 훅
export const useFirestoreCollection = <T = any>(
  collectionName: string,
  queryKey: readonly unknown[],
  options?: {
    where?: Array<[string, '==' | '!=' | '<' | '<=' | '>' | '>=', any]>;
    orderBy?: Array<[string, 'asc' | 'desc']>;
    limit?: number;
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<T[]> => {
      const collectionRef = collection(db, collectionName);
      let q: any = collectionRef;
      
      if (options?.where) {
        options.where.forEach(([field, op, value]) => {
          q = query(q, where(field, op, value));
        });
      }
      
      if (options?.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          q = query(q, orderBy(field, direction));
        });
      }
      
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as any)
      })) as T[];
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5분
  });
};

// 문서 추가 훅
export const useFirestoreAddDoc = <T = any>(
  collectionName: string,
  invalidateQueries?: unknown[][]
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const docRef = await addDoc(collection(db, collectionName), data);
      return { id: docRef.id, ...data } as T;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
  });
};

// 문서 업데이트 훅
export const useFirestoreUpdateDoc = <T = any>(
  collectionName: string,
  invalidateQueries?: unknown[][]
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
      return { id, ...data } as T;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
  });
};

// 문서 삭제 훅
export const useFirestoreDeleteDoc = (
  collectionName: string,
  invalidateQueries?: unknown[][]
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return id;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
  });
}; 