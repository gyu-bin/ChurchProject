import { db } from "@/firebase/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect } from "react";

import { User } from "@/constants/_types/user";

type UserInitializerProps = {
  setUserInfo: (user: User) => void;
};

export default function UserInitializer({ setUserInfo }: UserInitializerProps) {
  useEffect(() => {
    const listenUser = async () => {
      const raw = await AsyncStorage.getItem("currentUser");
      if (!raw) return;
      const cachedUser = JSON.parse(raw);
      const userRef = doc(db, "users", cachedUser.email);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const fresh = { ...userDoc.data(), email: cachedUser.email };
        setUserInfo(fresh as User);
        await AsyncStorage.setItem("currentUser", JSON.stringify(fresh));
      }
    };
    listenUser();
  }, []);

  return <></>;
}
