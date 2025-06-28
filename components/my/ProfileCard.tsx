import { EditProfileModal } from "@/components/my/editProfileModal/EditProfileModal";
import { User } from "@/constants/_types/user";
import { useDesign } from "@/context/DesignSystem";
import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

type ProfileCardProps = {
  user: User;
  handleUserUpdate: (updatedUser: User) => void;
};

export const ProfileCard = ({ user, handleUserUpdate }: ProfileCardProps) => {
  const { colors } = useDesign();

  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleEditToggle = () => {
    setShowEditProfile((prev) => !prev);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {user?.name ?? "이름"}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.subtext,
            }}
          >
            {user?.email ?? "이메일"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleEditToggle}
          style={{
            backgroundColor: colors.primary + "15",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            프로필 수정
          </Text>
        </TouchableOpacity>
      </View>

      {/* 뱃지 영역 */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {user?.division && (
          <View
            style={{
              backgroundColor: "#E3F2FD",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#1976D2",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {user.division}
            </Text>
          </View>
        )}
        {user?.role && (
          <View
            style={{
              backgroundColor: "#E8F5E9",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#2E7D32",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {user.role}
            </Text>
          </View>
        )}
        {user?.campus && (
          <View
            style={{
              backgroundColor: "#FDECEC",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#ff9191",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {user.campus}
            </Text>
          </View>
        )}
      </View>
      <EditProfileModal
        show={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        handleUserUpdate={handleUserUpdate}
      />
    </View>
  );
};
