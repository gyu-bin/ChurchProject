import { User } from '@/constants/_types/user';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

type UserContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  setUser: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const raw = await AsyncStorage.getItem("currentUser");
      if (!raw) {
        setUser(null);
        setLoading(false);
        return;
      }

      const cachedUser = JSON.parse(raw);
      const userRef = doc(db, "users", cachedUser.email);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const fresh = { ...userDoc.data(), email: cachedUser.email };
        setUser(fresh as User);
        await AsyncStorage.setItem("currentUser", JSON.stringify(fresh));
      } else {
        setUser(null);
        await AsyncStorage.removeItem("currentUser");
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useCurrentUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}; 