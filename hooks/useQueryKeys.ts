// TanStack Query에서 사용할 쿼리 키들
import { format } from 'date-fns';

export const queryKeys = {
  // 사용자 관련
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    settings: (userId: string) => [...queryKeys.user.all, 'settings', userId] as const,
  },

  // 팀 관련
  teams: {
    all: ['teams'] as const,
    list: () => [...queryKeys.teams.all, 'list'] as const,
    detail: (teamId: string) => [...queryKeys.teams.all, 'detail', teamId] as const,
    members: (teamId: string) => [...queryKeys.teams.all, 'members', teamId] as const,
    chat: (teamId: string) => [...queryKeys.teams.all, 'chat', teamId] as const,
  },

  // 부서 관련
  departments: {
    all: ['departments'] as const,
    list: () => [...queryKeys.departments.all, 'list'] as const,
    detail: (deptId: string) => [...queryKeys.departments.all, 'detail', deptId] as const,
    posts: (deptId: string) => [...queryKeys.departments.all, 'posts', deptId] as const,
  },

  // 기도 관련
  prayers: {
    all: ['prayers'] as const,
    list: () => [...queryKeys.prayers.all, 'list'] as const,
    detail: (prayerId: string) => [...queryKeys.prayers.all, 'detail', prayerId] as const,
    userPrayers: (userId: string) => [...queryKeys.prayers.all, 'user', userId] as const,
  },

  // 알림 관련
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },

  // 홈 관련
  home: {
    all: ['home'] as const,
    banner: () => [...queryKeys.home.all, 'banner'] as const,
    news: () => [...queryKeys.home.all, 'news'] as const,
    calendar: () => [...queryKeys.home.all, 'calendar'] as const,
    todayVerse: () => [...queryKeys.home.all, 'todayVerse'] as const,
  },

  // 설교 관련
  sermons: {
    all: ['sermons'] as const,
    list: () => [...queryKeys.sermons.all, 'list'] as const,
    detail: (sermonId: string) => [...queryKeys.sermons.all, 'detail', sermonId] as const,
    questions: (sermonId: string) => [...queryKeys.sermons.all, 'questions', sermonId] as const,
  },

  // 공지사항 관련
  notices: {
    all: ['notices'] as const,
    list: () => [...queryKeys.notices.all, 'list'] as const,
    detail: (noticeId: string) => [...queryKeys.notices.all, 'detail', noticeId] as const,
  },

  gratitudes: {
    all: ['gratitudes'] as const,
    list: (date?: Date) =>
      date
        ? ([...queryKeys.gratitudes.all, 'list', format(date, 'yyyy-MM-dd')] as const)
        : ([...queryKeys.gratitudes.all, 'list'] as const),
    detail: (id: string) => [...queryKeys.gratitudes.all, 'detail', id] as const,
  },
} as const;
