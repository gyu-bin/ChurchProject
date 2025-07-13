import { useFirestoreAddDoc, useFirestoreCollection } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 설교 질문 목록 조회
export const useSermonQuestions = (pageSize: number = 10) => {
  return useFirestoreCollection(
    'sermon_questions',
    queryKeys.sermons.list(),
    {
      orderBy: [['createdAt', 'desc']],
      limit: pageSize,
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

// 설교 질문 추가
export const useAddSermonQuestion = () => {
  return useFirestoreAddDoc(
    'sermon_questions',
    [queryKeys.sermons.list() as unknown as unknown[], queryKeys.sermons.all as unknown as unknown[]]
  );
}; 