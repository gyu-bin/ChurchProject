import UserInitializer from "@/components/user/UserInitializer";
import { User } from "@/constants/_types/user";
import { useDesign } from "@/context/DesignSystem";
import { db } from "@/firebase/config";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DepartmentPost } from "../list/useGetDepartmentPost";
import { formatFirebaseTimestamp } from "@/app/utils/formatFirebaseTimestamp";
import { CAMPUS_ENUM, DEPARTMENT_ENUM } from "@/app/constants/CampusDivisions";

const { width: screenWidth } = Dimensions.get("window");

interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Timestamp;
}

export default function DepartmentPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, font, radius } = useDesign();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<DepartmentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const postDoc = await getDoc(doc(db, "department_posts", id));

      if (postDoc.exists()) {
        const postData = {
          id: postDoc.id,
          ...postDoc.data(),
        } as DepartmentPost;
        setPost(postData);
        setLikeCount(postData.likes?.length || 0);
        setComments(postData.comments || []);

        // Check if current user liked the post
        if (userInfo && postData.likes) {
          setLiked(postData.likes.includes(userInfo.email));
        }
      } else {
        setError("게시물을 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("게시물 가져오기 실패:", err);
      setError("게시물을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Refetch post when user info changes
  useEffect(() => {
    if (userInfo && post) {
      if (post.likes) {
        setLiked(post.likes.includes(userInfo.email));
      }
    }
  }, [userInfo, post]);

  const handleLike = async () => {
    if (!post || !userInfo) return;

    try {
      const postRef = doc(db, "department_posts", post.id);

      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userInfo.email),
        });
        setLikeCount((prev) => prev - 1);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userInfo.email),
        });
        setLikeCount((prev) => prev + 1);
      }

      setLiked(!liked);
    } catch (err) {
      console.error("좋아요 처리 실패:", err);
      Alert.alert("오류", "좋아요 처리 중 오류가 발생했습니다.");
    }
  };

  const handleComment = async () => {
    if (!post || !userInfo || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: {
          id: userInfo.email,
          name: userInfo.name,
        },
        createdAt: Timestamp.now(),
      };

      const postRef = doc(db, "department_posts", post.id);
      await updateDoc(postRef, {
        comments: arrayUnion(comment),
      });

      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("댓글 작성 실패:", err);
      Alert.alert("오류", "댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <Image
      source={{ uri: item }}
      style={{
        width: screenWidth,
        height: screenWidth * 1.2,
        backgroundColor: colors.background,
      }}
      resizeMode="cover"
    />
  );

  const renderComment = ({ item }: { item: Comment }) => (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.sm,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
          {item.author.name.charAt(0)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
            {item.author.name}
          </Text>
          <Text
            style={{
              color: colors.subtext,
              fontSize: 12,
              marginLeft: spacing.sm,
            }}
          >
            {formatFirebaseTimestamp(item.createdAt)}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.lg,
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.subtext}
        />
        <Text
          style={{ color: colors.subtext, marginTop: spacing.md, fontSize: 16 }}
        >
          {error || "게시물을 찾을 수 없습니다."}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: radius.md,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <UserInitializer setUserInfo={setUserInfo} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: font.title,
              fontWeight: "bold",
              color: colors.text,
            }}
          >
            게시물
          </Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {/* Author Info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing.md,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
              {post.author.name.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}
            >
              {post.author.name}
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 14 }}>
              {CAMPUS_ENUM[post.campus]} • {DEPARTMENT_ENUM[post.division]}
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 12 }}>
              {formatFirebaseTimestamp(post.createdAt)}
            </Text>
          </View>
        </View>

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <View style={{ position: "relative" }}>
            <FlatList
              data={post.imageUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderImage}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth
                );
                setCurrentImageIndex(index);
              }}
            />

            {/* Image indicator */}
            {post.imageUrls.length > 1 && (
              <View
                style={{
                  position: "absolute",
                  top: spacing.md,
                  right: spacing.md,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>
                  {currentImageIndex + 1} / {post.imageUrls.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={{ padding: spacing.lg, backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
            {post.content}
          </Text>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={handleLike}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: spacing.lg,
            }}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? "#ff4757" : colors.text}
            />
            <Text style={{ color: colors.subtext, marginLeft: spacing.xs }}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: spacing.lg,
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
            <Text style={{ color: colors.subtext, marginLeft: spacing.xs }}>
              {comments.length}
            </Text>
          </TouchableOpacity>

          {/* // 공유 기능 추후 구현 */}
          {/* <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity> */}
        </View>

        {/* Comments */}
        <View style={{ backgroundColor: colors.card, marginTop: spacing.sm }}>
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}
            >
              댓글 ({comments.length})
            </Text>
          </View>

          {comments.length > 0 ? (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              scrollEnabled={false}
            />
          ) : (
            <View style={{ padding: spacing.lg, alignItems: "center" }}>
              <Text style={{ color: colors.subtext, fontSize: 14 }}>
                아직 댓글이 없습니다.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: spacing.md,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="댓글을 입력하세요..."
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            marginRight: spacing.sm,
            color: colors.text,
          }}
          multiline
        />
        <TouchableOpacity
          onPress={handleComment}
          disabled={!newComment.trim() || submittingComment}
          style={{
            backgroundColor: newComment.trim() ? colors.primary : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600" }}>전송</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
