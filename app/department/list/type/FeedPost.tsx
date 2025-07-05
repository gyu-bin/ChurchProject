import { useDesign } from "@/context/DesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { DepartmentPost } from "../useGetDepartmentPost";

const { width: screenWidth } = Dimensions.get("window");
const GRID_SPACING = 2; // 2px spacing between grid items
const GRID_ITEM_SIZE = (screenWidth - 32 - GRID_SPACING * 2) / 3; // 3 columns with padding

export default function FeedPost({ item }: { item: DepartmentPost }) {
  const { colors, radius } = useDesign();
  const hasImages = item.imageUrls && item.imageUrls.length > 0;
  const hasMultipleImages = hasImages && item.imageUrls.length > 1;

  const handlePress = () => {
    router.push(`/department/detail/${item.id}`);
  };

  return (
    <TouchableOpacity
      style={{
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
        marginBottom: GRID_SPACING,
        marginRight: GRID_SPACING,
        backgroundColor: colors.card,
        borderRadius: radius.sm,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {hasImages ? (
        // Show first image with multiple image indicator
        <View style={{ flex: 1, position: "relative" }}>
          <Image
            source={{ uri: item.imageUrls[0] }}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: colors.background,
            }}
            resizeMode="cover"
          />

          {/* Multiple images badge */}
          {hasMultipleImages && (
            <View
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, marginLeft: 2 }}>
                {item.imageUrls.length}
              </Text>
            </View>
          )}

          {/* Content overlay for long text */}
          {item.content && item.content.length > 50 && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                padding: 4,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 10,
                  lineHeight: 12,
                  fontWeight: "500",
                }}
                numberOfLines={2}
              >
                {item.content}
              </Text>
            </View>
          )}
        </View>
      ) : (
        // No images - show content as background
        <View
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            justifyContent: "center",
            alignItems: "center",
            padding: 8,
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color="#fff"
            style={{ marginBottom: 4 }}
          />
          <Text
            style={{
              color: "#fff",
              fontSize: 10,
              lineHeight: 12,
              textAlign: "center",
              fontWeight: "500",
            }}
            numberOfLines={3}
          >
            {item.content || "내용"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
