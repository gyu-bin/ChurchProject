// Team 타입 정의 (기존 redux slice에서 가져옴)
interface Team {
  id: string;
  name: string;
  leader: string;
  members: string[];
}
import { useFirestoreAddDoc, useFirestoreCollection, useFirestoreDeleteDoc, useFirestoreDoc, useFirestoreUpdateDoc } from './useFirestoreQuery';
import { queryKeys } from './useQueryKeys';

// 팀 목록 조회
export const useTeams = () => {
  return useFirestoreCollection(
    'teams',
    queryKeys.teams.list(),
    {
      where: [['approved', '==', true]],
      orderBy: [['createdAt', 'desc']],
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

// 팀 상세 조회
export const useTeam = (teamId: string) => {
  return useFirestoreDoc(
    'teams',
    teamId,
    queryKeys.teams.detail(teamId),
    {
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

// 팀 멤버 조회
export const useTeamMembers = (teamId: string) => {
  return useFirestoreCollection(
    'users',
    queryKeys.teams.members(teamId),
    {
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

// 팀 추가
export const useAddTeam = () => {
  return useFirestoreAddDoc<Team>(
    'teams',
    [queryKeys.teams.list() as unknown as unknown[], queryKeys.teams.all as unknown as unknown[]]
  );
};

// 팀 업데이트
export const useUpdateTeam = () => {
  return useFirestoreUpdateDoc<Team>(
    'teams',
    [queryKeys.teams.list() as unknown as unknown[], queryKeys.teams.all as unknown as unknown[]]
  );
};

// 팀 삭제
export const useDeleteTeam = () => {
  return useFirestoreDeleteDoc(
    'teams',
    [queryKeys.teams.list() as unknown as unknown[], queryKeys.teams.all as unknown as unknown[]]
  );
}; 