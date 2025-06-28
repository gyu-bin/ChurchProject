import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { User } from "@/constants/_types/user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const [isLoggedIn, currentUser] = await Promise.all([
        AsyncStorage.getItem("isLoggedIn"),
        AsyncStorage.getItem("currentUser"),
      ]);

      if (isLoggedIn !== "true" || !currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userData = JSON.parse(currentUser);
        if (!userData.email && userData.uid) {
          userData.email = userData.uid; // or 적절한 방식
        }
        setUser(userData);

        if (!userData || !userData.email) {
          throw new Error("유효하지 않은 사용자 데이터");
        }

        try {
          const userDoc = await getDoc(doc(db, "users", userData.email));
          if (userDoc.exists()) {
            const freshUserData = userDoc.data();
            const freshUser = { ...freshUserData, email: userData.email };
            setUser(freshUser as User);
            await AsyncStorage.setItem(
              "currentUser",
              JSON.stringify(freshUser)
            );
          } else {
            throw new Error("사용자가 더 이상 존재하지 않습니다");
          }
        } catch (error) {
          const firebaseError = error as Error;
          console.error("Firestore 사용자 정보 로드 실패:", firebaseError);
          if (firebaseError.message === "사용자가 더 이상 존재하지 않습니다") {
            throw firebaseError;
          }
        }
      } catch (error) {
        const parseError = error as Error;
        console.error("사용자 데이터 파싱 오류:", parseError);
        throw new Error("저장된 사용자 정보가 손상되었습니다");
      }
    } catch (error) {
      const err = error as Error;
      console.error("사용자 로드 중 오류:", err.message);
      setUser(null);
      await AsyncStorage.removeItem("currentUser");
      await AsyncStorage.setItem("isLoggedIn", "false");
      await AsyncStorage.removeItem("autoLogin");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (userData: any) => {
    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
    await AsyncStorage.setItem("isLoggedIn", "true");
    setUser(userData);
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setLoading(true);
        loadUser();
      }
    });

    return () => subscription.remove();
  }, []);

  return { user, loading, reload: loadUser, login };
}
