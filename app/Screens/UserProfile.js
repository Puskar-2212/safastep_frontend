import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BASE_URL } from "../../constants/config";

const UserProfile = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [currentUserMobile, setCurrentUserMobile] = useState(null);
  const [stats, setStats] = useState({
    posts: 0,
    ecoPoints: 0,
  });

  const viewingMobile = params.mobile;

  useEffect(() => {
    loadCurrentUser();
    loadUserPosts();
  }, []);

  const loadCurrentUser = async () => {
    const mobile = await AsyncStorage.getItem("mobile");
    setCurrentUserMobile(mobile);
  };

  const loadUserPosts = async () => {
    try {
      console.log("Loading posts for mobile:", viewingMobile);
      const response = await fetch(`${BASE_URL}/posts/user/${viewingMobile}`);
      const result = await response.json();

      console.log("Response:", result);

      if (response.ok && result.success) {
        console.log(`Loaded ${result.posts.length} posts`);
        setUserPosts(result.posts);
        calculateStats(result.posts);
      } else {
        console.error("Failed to load posts:", result);
      }
    } catch (error) {
      console.error("Error loading user posts:", error);
    }
  };

  const calculateStats = (posts) => {
    const totalLikes = posts.reduce((sum, post) => sum + post.likesCount, 0);
    setStats({
      posts: posts.length,
      ecoPoints: (posts.length * 100) + (totalLikes * 10),
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserPosts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Cover */}
        <View style={styles.coverContainer}>
          <View style={styles.coverGradient} />
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#fff" />
            </View>
          </View>

          <Text style={styles.userName}>Anonymous User</Text>
          <Text style={styles.userBio}>
            🌱 Making the world greener, one step at a time
          </Text>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </View>

        {/* User Posts Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
            <Text style={styles.postCount}>{userPosts.length} posts</Text>
          </View>
          
          {userPosts.length > 0 ? (
            <View style={styles.postsGrid}>
              {userPosts.map((post) => (
                <View key={post._id} style={styles.postCard}>
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  <View style={styles.postOverlay}>
                    <View style={styles.postStats}>
                      <MaterialIcons name="favorite" size={16} color="#fff" />
                      <Text style={styles.postStatText}>{post.likesCount}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-library" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No posts yet</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  coverContainer: {
    height: 180,
    backgroundColor: "#047857",
    position: "relative",
  },
  coverGradient: {
    flex: 1,
    backgroundColor: "linear-gradient(135deg, #047857 0%, #8B5CF6 100%)",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -50,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#047857",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  userBio: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
  postCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  postCard: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  postOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 16,
  },
  bottomPadding: {
    height: 100,
  },
});

export default UserProfile;


