import React, { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { User } from "@/constants/_types/user";

type UserInitializerProps = {
  setUserInfo: (user: User) => void;
};

export default function UserInitializer({ setUserInfo }: UserInitializerProps) {
  useEffect(() => {
    let unsubscribe: () => void;
    const listenUser = async () => {
      const raw = await AsyncStorage.getItem("currentUser");
      if (!raw) return;
      const cachedUser = JSON.parse(raw);
      const userRef = doc(db, "users", cachedUser.email);
      unsubscribe = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const fresh = { ...docSnap.data(), email: cachedUser.email };
          setUserInfo(fresh as User);
          await AsyncStorage.setItem("currentUser", JSON.stringify(fresh));
        }
      });
    };
    listenUser();
    return () => unsubscribe && unsubscribe();
  }, []);

  return <></>;
}
