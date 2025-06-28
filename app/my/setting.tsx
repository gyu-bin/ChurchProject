import DeviceManager from "@/app/my/DeviceManager";
import { useDesign } from "@/context/DesignSystem";
import { db } from "@/firebase/config";
import { useAppDispatch } from "@/hooks/useRedux";
import { clearPrayers } from "@/redux/slices/prayerSlice";
import { clearTeams } from "@/redux/slices/teamSlice";
import { logoutUser } from "@/redux/slices/userSlice";
import { removeDeviceToken } from "@/services/registerPushToken";
import { setScrollCallback } from "@/utils/scrollRefManager";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Toast from "react-native-root-toast";

import loading4 from "@/assets/lottie/Animation - 1747201330128.json";
import loading3 from "@/assets/lottie/Animation - 1747201413764.json";
import loading2 from "@/assets/lottie/Animation - 1747201431992.json";
import loading1 from "@/assets/lottie/Animation - 1747201461030.json";
import MyScreenContainer from "@/components/my/_common/ScreenContainer";
import ScreenHeader from "@/components/my/_common/ScreenHeader";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { colors } = useDesign();

  const scrollRef = useRef<ScrollView>(null);
  const dispatch = useAppDispatch();

  const [modalVisible, setModalVisible] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAnimation, setLoadingAnimation] = useState<any>(null);
  const loadingAnimations = [loading1, loading2, loading3, loading4];

  // const [notificationModalVisible, setNotificationModalVisible] = useState(false); // ✅ 알림 모달 상태

  if (!bcrypt.setRandomFallback) {
    console.warn("⚠️ bcryptjs 버전이 올바르지 않습니다.");
  }

  // ✅ RN 환경에서는 setRandomFallback을 등록해줘야 합니다
  bcrypt.setRandomFallback((len: number) => {
    const result = [];
    for (let i = 0; i < len; i++) {
      result.push(Math.floor(Math.random() * 256));
    }
    return result;
  });

  useEffect(() => {
    setScrollCallback("settings", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, []);

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
          setUser(fresh); // ✅ 실시간 업데이트
          await AsyncStorage.setItem("currentUser", JSON.stringify(fresh));
        }
      });
    };

    listenUser();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await removeDeviceToken();
    await AsyncStorage.removeItem("currentUser");
    await AsyncStorage.removeItem("useBiometric");
    dispatch(logoutUser());
    dispatch(clearPrayers());
    dispatch(clearTeams());
    router.replace("/auth/login");
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) return;

    Alert.alert(
      "계정 탈퇴",
      "정말로 계정을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user.email)); // 🔥 Firestore 삭제
              await AsyncStorage.removeItem("currentUser"); // 로컬 삭제

              dispatch(logoutUser());
              dispatch(clearPrayers());
              dispatch(clearTeams());

              Toast.show("👋 계정이 삭제되었습니다.", {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
              });

              router.replace("/auth/login");
            } catch (err) {
              Alert.alert("오류 발생", "계정 삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  // 재인증 함수 추가
  const reauthenticate = async (email: string, password: string) => {
    const userRef = doc(db, "users", email);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("사용자를 찾을 수 없습니다.");

    const userData = userSnap.data();
    const isValid = await bcrypt.compare(password, userData.password);
    if (!isValid) throw { code: "auth/wrong-password" };

    return true;
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async () => {
    if (loading) return;
    if (!user?.email || !oldPassword || !newPassword) {
      Alert.alert("입력 누락", "기존/새 비밀번호를 모두 입력해주세요.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * loadingAnimations.length);
    setLoadingAnimation(loadingAnimations[randomIndex]);
    setLoading(true);

    try {
      await reauthenticate(user.email, oldPassword);
      const hashed = await bcrypt.hash(newPassword, 10);
      await updateDoc(doc(db, "users", user.email), { password: hashed });
      const updatedUser = { ...user, password: hashed };
      await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setOldPassword("");
      setNewPassword("");
      setShowPasswordFields(false);
      setLoading(false);
      Toast.show("✅ 비밀번호가 변경되었습니다.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    } catch (err: any) {
      const message =
        err.code === "auth/wrong-password"
          ? "기존 비밀번호가 일치하지 않습니다."
          : err.message || "비밀번호 변경 중 오류가 발생했습니다.";
      Alert.alert("변경 실패", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyScreenContainer scrollRef={scrollRef}>
      {/* 헤더 */}
      <ScreenHeader title="설정" hasBackButton />

      {/* 로그인된 기기 */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: colors.surface,
          padding: 20,
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#e0f2fe",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="phone-portrait-outline" size={20} color="#0284c7" />
          </View>
          <Text style={{ fontSize: 16, color: colors.text }}>
            로그인된 기기
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
      </TouchableOpacity>
      <DeviceManager
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* 계정 설정 */}
      <View style={{ marginBottom: 32, marginTop: 32 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 16,
            paddingLeft: 4,
          }}
        >
          계정
        </Text>

        <View style={{ gap: 12 }}>
          {/* 비밀번호 변경 */}
          <TouchableOpacity
            onPress={() => setShowPasswordFields(true)}
            style={{
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#fef3c7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#d97706"
                />
              </View>
              <Text style={{ fontSize: 16, color: colors.text }}>
                비밀번호 변경
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
          {/* 비밀번호 찾기 */}
          <TouchableOpacity
            onPress={() => router.push("/my/ForgotPassword")}
            style={{
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#fef3c7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="key-outline" size={20} color="#d97706" />
              </View>
              <Text style={{ fontSize: 16, color: colors.text }}>
                비밀번호 찾기
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          {/* 회원 탈퇴 */}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 16, color: colors.error }}>
                회원 탈퇴
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </TouchableOpacity>

          {/* 로그아웃 */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 16, color: colors.error }}>
                로그아웃
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 비밀번호 변경 모달 */}
      <Modal visible={showPasswordFields} transparent animationType="fade">
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
              }}
            >
              비밀번호 변경
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.subtext,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                기존 비밀번호
              </Text>
              <TextInput
                placeholder="기존 비밀번호 입력"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showPassword}
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

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.subtext,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                새 비밀번호
              </Text>
              <TextInput
                placeholder="새 비밀번호 입력"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
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

            {/* 비밀번호 보기/숨기기 토글 */}
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={{
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.primary}
              />
              <Text style={{ color: colors.primary }}>
                {showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              </Text>
            </TouchableOpacity>

            {/* 변경 버튼 */}
            <TouchableOpacity
              onPress={handlePasswordChange}
              style={{
                backgroundColor: loading ? colors.subtext : colors.primary,
                padding: 16,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 12,
                opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {loading ? "변경 중..." : "비밀번호 변경하기"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 로딩 모달 */}
      {loading && (
        <Modal visible={true} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 9999,
            }}
          >
            {loadingAnimation && (
              <LottieView
                source={loadingAnimation}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
            )}
            <Text
              style={{
                color: "#fff",
                marginTop: 16,
                fontSize: 16,
              }}
            >
              비밀번호 변경 중...
            </Text>
          </View>
        </Modal>
      )}

      {/* 비밀번호 변경 모달  - 프로필 수정에서 사용*/}
      <Modal visible={showPasswordFields} transparent animationType="fade">
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
              }}
            >
              비밀번호 변경
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.subtext,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                기존 비밀번호
              </Text>
              <TextInput
                placeholder="기존 비밀번호 입력"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showPassword}
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

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.subtext,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                새 비밀번호
              </Text>
              <TextInput
                placeholder="새 비밀번호 입력"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
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

            {/* 비밀번호 보기/숨기기 토글 */}
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={{
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.primary}
              />
              <Text style={{ color: colors.primary }}>
                {showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              </Text>
            </TouchableOpacity>

            {/* 변경 버튼 */}
            <TouchableOpacity
              onPress={handlePasswordChange}
              style={{
                backgroundColor: loading ? colors.subtext : colors.primary,
                padding: 16,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 12,
                opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {loading ? "변경 중..." : "비밀번호 변경하기"}
              </Text>
            </TouchableOpacity>

            {/* 닫기 버튼 */}
            <TouchableOpacity
              onPress={() => {
                setShowPasswordFields(false);
                setOldPassword("");
                setNewPassword("");
              }}
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
                프로필 수정으로 돌아가기
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </MyScreenContainer>
  );
}
