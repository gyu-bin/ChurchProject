import { User } from "@/constants/_types/user";
import { db } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert } from "react-native";
import Toast from "react-native-root-toast";

type EditProfileModal = {
  onClose: () => void;
  user: User;
  handleUserUpdate: (updatedUser: User) => void;
};

export const useEditProfile = ({
  onClose,
  user,
  handleUserUpdate,
}: EditProfileModal) => {
  const { reload } = useAuth();

  const [editValues, setEditValues] = useState<Record<string, string>>({
    name: user.name,
    email: user.email,
    division: user.division,
    campus: user.campus,
    role: user.role,
  });

  const handleSaveProfile = async () => {
    if (!user?.name) return;

    const updatedFields: Record<string, string> = {};
    Object.entries(editValues).forEach(([key, value]) => {
      if (value !== user[key as keyof User]) {
        updatedFields[key] = value;
      }
    });

    if (Object.keys(updatedFields).length === 0) {
      Toast.show("변경된 내용이 없습니다.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.email), updatedFields);

      const updatedUser = { ...user, ...updatedFields };

      await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
      await reload();

      Toast.show("✅ 정보가 수정되었습니다.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });

      onClose();
      handleUserUpdate(updatedUser);
    } catch (err) {
      console.error(err);
      Alert.alert("수정 실패", "다시 시도해주세요.");
    }
  };

  const handleCancelAndClose = () => {
    setEditValues({
      name: user.name,
      email: user.email,
      division: user.division,
      campus: user.campus,
      role: user.role,
    });
    onClose();
  };

  return {
    editValues,
    setEditValues,
    handleSaveProfile,
    handleCancelAndClose,
  };
};
