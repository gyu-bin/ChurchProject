import { useFirestoreCollection } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 알림 목록 조회
export const useNotifications = (userEmail: string) => {
  return useFirestoreCollection(
    'notifications',
    [...queryKeys.notifications.list(), userEmail],
    {
      where: [['to', '==', userEmail]],
      // orderBy: [['createdAt', 'desc']],
      limit: 20,
      enabled: !!userEmail,
      staleTime: 1 * 60 * 1000, // 1분
    }
  );
};

// 읽지 않은 알림 조회
export const useUnreadNotifications = (userEmail: string) => {
  return useFirestoreCollection(
    'notifications',
    queryKeys.notifications.unread(),
    {
      where: [['to', '==', userEmail], ['read', '==', false]],
      // orderBy: [['createdAt', 'desc']],
      staleTime: 1 * 60 * 1000, // 1분
    }
  );
}; 