import { db } from '@/firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

// 타입 정의 (실제 데이터 구조에 맞게 확장)
export type Team = { id: string; [key: string]: any };
export type DepartmentPost = { id: string; [key: string]: any };
export type Share = { id: string; [key: string]: any };
export type Notice = { id: string; [key: string]: any };
export type Event = { id: string; [key: string]: any };
export type Banner = { id: string; [key: string]: any };
export type User = { id: string; [key: string]: any };

export type GlobalDataContextType = {
  teams: Team[];
  departments: DepartmentPost[];
  shares: Share[];
  notices: Notice[];
  events: Event[];
  banners: Banner[];
  users: User[];
};

const GlobalDataContext = createContext<GlobalDataContextType>({
  teams: [],
  departments: [],
  shares: [],
  notices: [],
  events: [],
  banners: [],
  users: [],
});

export const GlobalDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<DepartmentPost[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // 모임(teams)
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 부서 게시글(department_posts)
    const unsubDepartments = onSnapshot(collection(db, 'department_posts'), (snap) => {
      setDepartments(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 나눔(shares)
    const unsubShares = onSnapshot(collection(db, 'shares'), (snap) => {
      setShares(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 공지(notice)
    const unsubNotices = onSnapshot(collection(db, 'notice'), (snap) => {
      setNotices(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 이벤트(event)
    const unsubEvents = onSnapshot(collection(db, 'event'), (snap) => {
      setEvents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 배너(banner)
    const unsubBanners = onSnapshot(collection(db, 'banner'), (snap) => {
      setBanners(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    // 유저(users)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTeams();
      unsubDepartments();
      unsubShares();
      unsubNotices();
      unsubEvents();
      unsubBanners();
      unsubUsers();
    };
  }, []);

  return (
    <GlobalDataContext.Provider value={{ teams, departments, shares, notices, events, banners, users }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => useContext(GlobalDataContext); 