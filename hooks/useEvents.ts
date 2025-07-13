import { useFirestoreCollection } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 이벤트 목록 조회
export const useEvents = () => {
  return useFirestoreCollection('notice', queryKeys.home.calendar(), {
    where: [['type', '==', 'event']],
    orderBy: [['startDate', 'asc']],
    staleTime: 10 * 60 * 1000, // 10분
  });
};

// 배너 목록 조회
export const useBanners = () => {
  return useFirestoreCollection('notice', queryKeys.home.banner(), {
    where: [['type', '==', 'banner']],
    // orderBy: [['title', 'asc']], // 임시로 title 기준 정렬
    staleTime: 10 * 60 * 1000, // 10분
  });
};

// 공지사항 목록 조회
export const useNotices = () => {
  return useFirestoreCollection('notice', queryKeys.notices.list(), {
    where: [['type', '==', 'notice']],
    orderBy: [['createdAt', 'desc']],
    staleTime: 5 * 60 * 1000, // 5분
  });
};
