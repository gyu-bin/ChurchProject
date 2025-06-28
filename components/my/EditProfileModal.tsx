import { User } from "@/constants/_types/user";
import { useDesign } from "@/context/DesignSystem";
import { db } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";

type EditProfileModalProps = {
  show: boolean;
  onClose: () => void;
  user: User;
  handleUserUpdate: (updatedUser: User) => void;
};

export const EditProfileModal = ({
  show,
  onClose,
  user,
  handleUserUpdate,
}: EditProfileModalProps) => {
  const { colors } = useDesign();
  const { reload } = useAuth();

  const [editValues, setEditValues] = useState<Record<string, string>>({
    name: user.name,
    email: user.email,
    division: user.division,
    campus: user.campus,
    role: user.role,
  });

  const handleSaveProfile = async () => {
    if (!user?.name) return; // 문서 ID로 name을 사용 중

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
      // 🔧 문서 ID로 name 사용
      await updateDoc(doc(db, "users", user.email), updatedFields);

      const updatedUser = { ...user, ...updatedFields };

      // Update AsyncStorage
      await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
      await reload();

      handleUserUpdate(updatedUser);

      Toast.show("✅ 정보가 수정되었습니다.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });

      onClose();
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

  return (
    <Modal visible={show} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "90%",
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            프로필 수정
          </Text>

          {/* 입력 필드들 */}
          {[
            { label: "이름", key: "name" },
            { label: "이메일", key: "email" },
            { label: "부서", key: "division" },
            { label: "캠퍼스", key: "campus" },
          ].map(({ label, key }) => (
            <View key={key} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.subtext,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                {label}
              </Text>
              <TextInput
                placeholder={`${label} 입력`}
                value={editValues[key]}
                onChangeText={(text) =>
                  setEditValues((prev) => ({ ...prev, [key]: text }))
                }
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === "ios" ? 16 : 12,
                  color: colors.text,
                  backgroundColor: colors.card,
                  fontSize: 16,
                }}
                placeholderTextColor={colors.subtext}
              />
            </View>
          ))}
          {/* 저장 버튼 */}
          <TouchableOpacity
            onPress={handleSaveProfile}
            style={{
              backgroundColor: colors.primary,
              padding: 16,
              borderRadius: 16,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              저장하기
            </Text>
          </TouchableOpacity>

          {/* 닫기 버튼 */}
          <TouchableOpacity
            onPress={handleCancelAndClose}
            style={{
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.subtext,
                fontSize: 16,
              }}
            >
              닫기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
