// Detail screen for a single community post with like and share actions.
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../config";

const ACCENT = "#0C8A4B";
const BG = "#F8F9FA";
const SURFACE = "#FFFFFF";
const TEXT = "#191C1D";
const MUTED = "#5F6B66";
const BORDER = "#E1E3E4";

const CATEGORY_STYLES = {
  Transportation: { icon: "directions-bus", color: "#3B82F6", bg: "#EAF2FF" },
  Plantation: { icon: "park", color: "#0C8A4B", bg: "#E8F7F0" },
  Recycling: { icon: "recycling", color: "#8B5CF6", bg: "#F3E8FF" },
  "Waste Management": { icon: "delete-outline", color: "#F59E0B", bg: "#FEF3C7" },
  "Energy Conservation": { icon: "bolt", color: "#EF4444", bg: "#FEE2E2" },
  default: { icon: "eco", color: "#0C8A4B", bg: "#E8F7F0" },
};

const formatTime = (timestamp) => {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

export default function PostDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharing, setSharing] = useState(false);

  const categoryStyle = useMemo(() => {
    if (!post?.category) return CATEGORY_STYLES.default;
    return CATEGORY_STYLES[post.category] || CATEGORY_STYLES.default;
  }, [post]);

  const getStoredIdentifier = useCallback(async () => {
    // Like state depends on who is viewing the post, so the detail screen resolves the active session identifier.
    const email = await AsyncStorage.getItem("email");
    const mobile = await AsyncStorage.getItem("mobile");
    return email || mobile;
  }, []);

  const fetchPost = useCallback(async () => {
    try {
      const identifier = await getStoredIdentifier();
      // Sending userId lets the backend include personalized fields such as liked/unliked state.
      const query = identifier ? `?userId=${encodeURIComponent(identifier)}` : "";

      const response = await fetch(`${BASE_URL}/posts/${params.postId}${query}`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      const data = await response.json();

      if (data.success) {
        // Local state is split out so the user can like/unlike without waiting for a full refetch each tap.
        setPost(data.post);
        setLiked(data.post.liked || false);
        setLikesCount(data.post.likesCount || 0);
      } else {
        Alert.alert("Error", "Post not found");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      Alert.alert("Error", "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [getStoredIdentifier, params.postId, router]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    try {
      const identifier = await getStoredIdentifier();

      if (!identifier) {
        Alert.alert("Error", "Please log in to like posts");
        return;
      }

      // Backend like toggles still use multipart form data to stay consistent with the rest of the post actions.
      const formData = new FormData();
      if (identifier.includes("@")) {
        formData.append("email", identifier);
      } else {
        formData.append("mobile", identifier);
      }

      const response = await fetch(`${BASE_URL}/posts/${params.postId}/like`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        Alert.alert("Error", "Failed to like post");
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Update counters from the backend response so the UI always matches stored like state.
        setLiked(data.liked);
        setLikesCount(data.likesCount);
      } else {
        Alert.alert("Error", data.detail || "Failed to like post");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to like post");
    }
  };

  const handleShare = async () => {
    if (!post || sharing) return;

    try {
      setSharing(true);
      // Share message includes impact and image URL so the shared content still makes sense outside the app.
      const message = `Check out this eco-action on SafaStep.\n\n${post.userName} saved ${post.co2Offset || 0} kg CO2 by ${post.category || "Eco Post"}.\n\n${post.caption ? `"${post.caption}"\n\n` : ""}${post.imageUrl}`;

      await Share.share({ message, url: post.imageUrl });
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert("Error", "Unable to share this post right now.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
      >
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.userLeft}>
              <View style={styles.avatar}>
                {post.userProfilePicture ? (
                  <Image source={{ uri: post.userProfilePicture }} style={styles.avatarImage} />
                ) : (
                  <MaterialIcons name="person" size={24} color="#94A3B8" />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.userName}</Text>
                <Text style={styles.timeText}>{formatTime(post.createdAt)}</Text>
              </View>
            </View>
          </View>

          {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}

          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />

          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
              <MaterialIcons name={categoryStyle.icon} size={16} color={categoryStyle.color} />
              <Text style={[styles.categoryText, { color: categoryStyle.color }]}>
                {post.category || "Eco Post"}
              </Text>
            </View>

            <View style={styles.impactRow}>
              <View style={styles.impactBadge}>
                <MaterialIcons name="local-fire-department" size={16} color={ACCENT} />
                <Text style={styles.impactText}>{post.ecoPoints || 0} pts</Text>
              </View>
              <View style={styles.impactBadge}>
                <MaterialIcons name="cloud" size={16} color="#3B82F6" />
                <Text style={styles.impactText}>{post.co2Offset || 0} kg</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionButton} onPress={handleLike}>
              <MaterialIcons
                name={liked ? "favorite" : "favorite-border"}
                size={22}
                color={liked ? "#F43F5E" : "#64748B"}
              />
              <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likesCount}</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleShare}>
              <MaterialIcons name="share" size={20} color="#64748B" />
              <Text style={styles.actionText}>{sharing ? "..." : "Share"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },
  errorText: {
    fontSize: 16,
    color: MUTED,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },
  timeText: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
  },
  caption: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT,
  },
  postImage: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    marginTop: 14,
    backgroundColor: "#F1F5F9",
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  impactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },
  impactText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
  },
  actionsRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  actionTextLiked: {
    color: "#F43F5E",
  },
});
