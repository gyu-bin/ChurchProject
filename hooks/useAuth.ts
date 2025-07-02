import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '@/constants/_types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const [isLoggedIn, currentUser] = await Promise.all([
        AsyncStorage.getItem('isLoggedIn'),
        AsyncStorage.getItem('currentUser'),
      ]);

      if (isLoggedIn !== 'true' || !currentUser) {
        throw new Error('로그인 정보 없음');
      }

      const userData = JSON.parse(currentUser);
      if (!userData.email && userData.uid) {
        userData.email = userData.uid;
      }

      const userDoc = await getDoc(doc(db, 'users', userData.email));
      if (!userDoc.exists()) {
        throw new Error('사용자 없음');
      }

      const freshUser = { ...userDoc.data(), email: userData.email };
      await AsyncStorage.setItem('currentUser', JSON.stringify(freshUser));
      setUser(freshUser as User);
    } catch (error) {
      setUser(null);
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.setItem('isLoggedIn', 'false');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (userData: User) => {
    await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
    await AsyncStorage.setItem('isLoggedIn', 'true');
    setUser(userData);
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadUser();
      }
    });
    return () => sub.remove();
  }, []);

  return { user, loading, login, reload: loadUser };
}
