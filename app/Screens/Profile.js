import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { BASE_URL } from "../config";

const Profile = ({ userData, onRefresh }) => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [stats, setStats] = useState({
    posts: 0,
    ecoPoints: 0,
  });

  useEffect(() => {
    if (userData) {
      loadUserPosts();
    }
  }, [userData]);

  useEffect(() => {
    calculateStats();
  }, [userPosts]);

  const loadUserPosts = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const response = await fetch(`${BASE_URL}/posts/user/${mobile}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setUserPosts(result.posts);
      }
    } catch (error) {
      console.error("Error loading user posts:", error);
    }
  };

  const calculateStats = () => {
    const totalLikes = userPosts.reduce((sum, post) => sum + post.likesCount, 0);
    setStats({
      posts: userPosts.length,
      ecoPoints: (userPosts.length * 100) + (totalLikes * 10),
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserPosts();
    if (onRefresh) await onRefresh();
    setRefreshing(false);
  };

  const handleSettingsMenu = () => {
    router.push("/Screens/Settings");
  };

  const handleProfilePhotoOptions = () => {
    Alert.alert(
      "Profile Photo",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => pickImage(),
        },
        {
          text: "Remove Photo",
          onPress: () => removePhoto(),
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadProfilePhoto = async (imageUri) => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const formData = new FormData();
      formData.append("mobile", mobile);

      const imageFile = {
        uri: imageUri,
        type: "image/jpeg",
        name: `profile_${Date.now()}.jpg`,
      };
      formData.append("file", imageFile);

      const response = await fetch(`${BASE_URL}/upload-profile-picture`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert("Success", "Profile photo updated!");
        if (onRefresh) await onRefresh();
      } else {
        Alert.alert("Error", result.detail || "Failed to update profile photo");
      }
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      Alert.alert("Error", "Failed to upload profile photo");
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const mobile = await AsyncStorage.getItem("mobile");
              const response = await fetch(`${BASE_URL}/delete-profile-picture/${mobile}`, {
                method: "DELETE",
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert("Success", "Profile photo removed!");
                if (onRefresh) await onRefresh();
              } else {
                Alert.alert("Error", "Failed to remove profile photo");
              }
            } catch (error) {
              console.error("Error removing profile photo:", error);
              Alert.alert("Error", "Failed to remove profile photo");
            }
          },
        },
      ]
    );
  };

  const achievements = [
    { id: 1, icon: "eco", title: "Eco Warrior", color: "#10B981", unlocked: true },
    { id: 2, icon: "park", title: "Tree Planter", color: "#059669", unlocked: true },
    { id: 3, icon: "recycling", title: "Recycler", color: "#8B5CF6", unlocked: true },
    { id: 4, icon: "bolt", title: "Energy Saver", color: "#F59E0B", unlocked: false },
    { id: 5, icon: "water-drop", title: "Water Hero", color: "#3B82F6", unlocked: false },
    { id: 6, icon: "directions-bike", title: "Green Commuter", color: "#6366F1", unlocked: false },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header with Cover */}
      <View style={styles.coverContainer}>
        <View style={styles.coverGradient} />
        <Pressable style={styles.settingsButton} onPress={handleSettingsMenu}>
          <MaterialIcons name="settings" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {userData?.profilePicture ? (
            <Image
              source={{ uri: userData.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#fff" />
            </View>
          )}
          <Pressable
            style={styles.editAvatarButton}
            onPress={handleProfilePhotoOptions}
          >
            <MaterialIcons name="camera-alt" size={18} color="#6366F1" />
          </Pressable>
        </View>

        <Text style={styles.userName}>
          {userData?.firstName} {userData?.lastName}
        </Text>
        <Text style={styles.userBio}>
          🌱 Making the world greener, one step at a time
        </Text>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.ecoPoints}</Text>
            <Text style={styles.statLabel}>Eco Points</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.primaryButton}>
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton}>
            <MaterialIcons name="share" size={20} color="#6366F1" />
          </Pressable>
        </View>
      </View>

      {/* Eco Points Card */}
      <View style={styles.ecoPointsCard}>
        <View style={styles.ecoPointsHeader}>
          <View style={styles.ecoPointsIcon}>
            <MaterialIcons name="eco" size={28} color="#fff" />
          </View>
          <View style={styles.ecoPointsInfo}>
            <Text style={styles.ecoPointsLabel}>Eco Points</Text>
            <Text style={styles.ecoPointsValue}>{stats.ecoPoints}</Text>
          </View>
        </View>
        <Text style={styles.ecoPointsSubtext}>
          Keep making eco-friendly actions to earn more points!
        </Text>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Pressable>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        </View>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementLocked,
              ]}
            >
              <View
                style={[
                  styles.achievementIcon,
                  { backgroundColor: achievement.unlocked ? achievement.color : "#E2E8F0" },
                ]}
              >
                <MaterialIcons
                  name={achievement.icon}
                  size={28}
                  color={achievement.unlocked ? "#fff" : "#94A3B8"}
                />
              </View>
              <Text
                style={[
                  styles.achievementTitle,
                  !achievement.unlocked && styles.achievementTitleLocked,
                ]}
              >
                {achievement.title}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* User Posts Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Posts</Text>
          <Text style={styles.postCount}>{userPosts.length} posts</Text>
        </View>
        
        {userPosts.length > 0 ? (
          <View style={styles.postsGrid}>
            {userPosts.map((post) => (
              <Pressable key={post._id} style={styles.postCard}>
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
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="photo-library" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Share your eco-actions to inspire others!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  coverContainer: {
    height: 180,
    backgroundColor: "#6366F1",
    position: "relative",
  },
  coverGradient: {
    flex: 1,
    backgroundColor: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  },
  settingsButton: {
    position: "absolute",
    top: 50,
    right: 20,
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
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#6366F1",
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
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FAFBFC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginBottom: 20,
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
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  ecoPointsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: "#10B981",
    borderRadius: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ecoPointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  ecoPointsIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  ecoPointsInfo: {
    flex: 1,
  },
  ecoPointsLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  ecoPointsValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  ecoPointsSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 20,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  postCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  achievementTitleLocked: {
    color: "#94A3B8",
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
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  bottomPadding: {
    height: 100,
  },
});

export default Profile;
