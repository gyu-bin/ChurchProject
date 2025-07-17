import React, { createContext, useContext, useState } from 'react';

interface ScrollRefContextType {
  teamsListRef: React.RefObject<any> | null;
  communityListRef: React.RefObject<any> | null;
  setTeamsListRef: (ref: React.RefObject<any>) => void;
  setCommunityListRef: (ref: React.RefObject<any>) => void;
}

const ScrollRefContext = createContext<ScrollRefContextType>({
  teamsListRef: null,
  communityListRef: null,
  setTeamsListRef: () => {},
  setCommunityListRef: () => {},
});

export const ScrollRefProvider = ({ children }: { children: React.ReactNode }) => {
  const [teamsListRef, setTeamsListRef] = useState<React.RefObject<any> | null>(null);
  const [communityListRef, setCommunityListRef] = useState<React.RefObject<any> | null>(null);

  return (
    <ScrollRefContext.Provider value={{ teamsListRef, communityListRef, setTeamsListRef, setCommunityListRef }}>
      {children}
    </ScrollRefContext.Provider>
  );
};

export const useScrollRef = () => useContext(ScrollRefContext); 