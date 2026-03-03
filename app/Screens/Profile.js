import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { BASE_URL } from "../../constants/config";

const Profile = ({ userData, onRefresh, viewingUserId = null }) => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [viewingUserData, setViewingUserData] = useState(null);
  const [carbonFootprint, setCarbonFootprint] = useState(null);
  const [stats, setStats] = useState({
    posts: 0,
    ecoPoints: 0,
  });

  // Edit profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if viewing own profile or another user's profile
  const isOwnProfile = !viewingUserId || userData?.mobile === viewingUserId;

  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      // Load other user's data
      loadViewingUserData();
    } else if (userData) {
      loadUserPosts();
      loadCarbonFootprint();
    }
  }, [userData, viewingUserId]);

  const loadCarbonFootprint = async () => {
    try {
      const mobile = userData?.mobile || (await AsyncStorage.getItem("mobile"));
      const response = await fetch(
        `${BASE_URL}/carbon-footprint/latest/${mobile}`,
      );
      const result = await response.json();

      if (response.ok && result.success && result.hasResult) {
        setCarbonFootprint(result.result);
      }
    } catch (error) {
      console.error("Error loading carbon footprint:", error);
    }
  };

  const loadViewingUserData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/user/${viewingUserId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setViewingUserData(result.user);
        loadUserPosts(viewingUserId);
      }
    } catch (error) {
      console.error("Error loading viewing user data:", error);
    }
  };

  useEffect(() => {
    calculateStats();
  }, [userPosts, userData, viewingUserData]); // Added userData and viewingUserData as dependencies

  const loadUserPosts = async (targetMobile = null) => {
    try {
      // Use targetMobile if provided (viewing other user), otherwise use own mobile
      const mobile =
        targetMobile ||
        userData?.mobile ||
        (await AsyncStorage.getItem("mobile"));

      console.log("Loading posts for mobile:", mobile); // Debug log

      const response = await fetch(`${BASE_URL}/posts/user/${mobile}`);
      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`Loaded ${result.posts.length} posts for user ${mobile}`); // Debug log
        setUserPosts(result.posts);
      }
    } catch (error) {
      console.error("Error loading user posts:", error);
    }
  };

  const calculateStats = () => {
    const totalLikes = userPosts.reduce(
      (sum, post) => sum + post.likesCount,
      0,
    );

    // Get ecoPoints from userData, fallback to 0 if not available
    const userEcoPoints =
      userData?.ecoPoints || viewingUserData?.ecoPoints || 0;

    // Debug logging
    console.log("Profile calculateStats:", {
      userData_ecoPoints: userData?.ecoPoints,
      viewingUserData_ecoPoints: viewingUserData?.ecoPoints,
      final_ecoPoints: userEcoPoints,
      userData_keys: userData ? Object.keys(userData) : "null",
    });

    setStats({
      posts: userPosts.length,
      ecoPoints: userEcoPoints,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (viewingUserId && !isOwnProfile) {
      await loadViewingUserData();
    } else {
      await loadUserPosts();
      await loadCarbonFootprint();
      if (onRefresh) await onRefresh();
    }
    setRefreshing(false);
  };

  const handleDeletePost = (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const identifier =
              userData?.mobile ||
              userData?.email ||
              (await AsyncStorage.getItem("mobile"));

            // Check if identifier is email or mobile
            const paramName = identifier.includes("@") ? "email" : "mobile";

            const response = await fetch(
              `${BASE_URL}/posts/${postId}?${paramName}=${identifier}`,
              {
                method: "DELETE",
              },
            );

            const result = await response.json();

            if (response.ok && result.success) {
              Alert.alert("Success", "Post deleted successfully!");
              // Remove post from local state
              setUserPosts(userPosts.filter((post) => post._id !== postId));
            } else {
              Alert.alert("Error", result.detail || "Failed to delete post");
            }
          } catch (error) {
            console.error("Error deleting post:", error);
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleSettingsMenu = () => {
    router.push("/Screens/Settings");
  };

  const handleEditProfile = () => {
    // Initialize form with current user data
    setEditForm({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      dateOfBirth: userData?.dateOfBirth
        ? new Date(
            userData.dateOfBirth.year,
            userData.dateOfBirth.month - 1,
            userData.dateOfBirth.day,
          )
        : new Date(),
    });
    setEditModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEditForm({ ...editForm, dateOfBirth: selectedDate });
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }

    setIsUpdating(true);
    try {
      const identifier = userData?.mobile || userData?.email;
      const formData = new FormData();

      if (userData?.mobile) {
        formData.append("mobile", userData.mobile);
      } else if (userData?.email) {
        formData.append("email", userData.email);
      }

      formData.append("firstName", editForm.firstName.trim());
      formData.append("lastName", editForm.lastName.trim());

      const dobObject = {
        day: editForm.dateOfBirth.getDate(),
        month: editForm.dateOfBirth.getMonth() + 1,
        year: editForm.dateOfBirth.getFullYear(),
      };
      formData.append("dateOfBirth", JSON.stringify(dobObject));

      const response = await fetch(`${BASE_URL}/update-profile`, {
        method: "PUT",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert("Success", "Profile updated successfully!");
        setEditModalVisible(false);
        if (onRefresh) await onRefresh();
      } else {
        Alert.alert("Error", result.detail || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProfilePhotoOptions = () => {
    Alert.alert(
      "Profile Photo Verification",
      "For security, profile photos must be taken with your camera to verify your identity.",
      [
        {
          text: "Take Live Photo",
          onPress: () => takePhoto(),
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
      ],
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
        cameraType: "front", // Force front camera for selfie
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
        Alert.alert(
          "Success! ✓",
          result.faceVerified
            ? "Profile photo updated and face verified!"
            : "Profile photo updated!",
          [{ text: "OK" }],
        );
        if (onRefresh) await onRefresh();
      } else {
        Alert.alert(
          "Face Verification Failed",
          result.detail ||
            "Failed to update profile photo. Please use a clear photo of your face.",
        );
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
              const response = await fetch(
                `${BASE_URL}/delete-profile-picture/${mobile}`,
                {
                  method: "DELETE",
                },
              );

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
      ],
    );
  };

  const achievements = [
    {
      id: 1,
      icon: "eco",
      title: "Eco Warrior",
      color: "#047857",
      unlocked: true,
    },
    {
      id: 2,
      icon: "park",
      title: "Tree Planter",
      color: "#047857",
      unlocked: true,
    },
    {
      id: 3,
      icon: "recycling",
      title: "Recycler",
      color: "#8B5CF6",
      unlocked: true,
    },
    {
      id: 4,
      icon: "bolt",
      title: "Energy Saver",
      color: "#F59E0B",
      unlocked: false,
    },
    {
      id: 5,
      icon: "water-drop",
      title: "Water Hero",
      color: "#3B82F6",
      unlocked: false,
    },
    {
      id: 6,
      icon: "directions-bike",
      title: "Green Commuter",
      color: "#047857",
      unlocked: false,
    },
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
        {isOwnProfile && (
          <Pressable style={styles.settingsButton} onPress={handleSettingsMenu}>
            <MaterialIcons name="settings" size={22} color="#fff" />
          </Pressable>
        )}
        {!isOwnProfile && (
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {isOwnProfile ? (
            <>
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
                <MaterialIcons name="camera-alt" size={18} color="#047857" />
              </Pressable>
            </>
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.userName}>
          {isOwnProfile
            ? `${userData?.firstName} ${userData?.lastName}`
            : "Anonymous User"}
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

        {/* Action Buttons - only show for own profile */}
        {isOwnProfile && (
          <View style={styles.actionButtons}>
            <Pressable style={styles.primaryButton} onPress={handleEditProfile}>
              <MaterialIcons name="edit" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton}>
              <MaterialIcons name="share" size={20} color="#047857" />
            </Pressable>
          </View>
        )}
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

      {/* Carbon Footprint Card - Only show on own profile */}
      {isOwnProfile && carbonFootprint && (
        <View style={styles.carbonFootprintCard}>
          <View style={styles.carbonFootprintHeader}>
            <View style={styles.carbonFootprintIconContainer}>
              <MaterialIcons name="cloud" size={28} color="#047857" />
            </View>
            <View style={styles.carbonFootprintInfo}>
              <Text style={styles.carbonFootprintLabel}>Carbon Footprint</Text>
              <View style={styles.carbonFootprintScoreRow}>
                <Text style={styles.carbonFootprintValue}>
                  {carbonFootprint.totalCO2} kg/day
                </Text>
                <View
                  style={[
                    styles.impactLevelBadge,
                    {
                      backgroundColor:
                        carbonFootprint.impactLevel === "Excellent"
                          ? "#047857"
                          : carbonFootprint.impactLevel === "Good"
                            ? "#3B82F6"
                            : carbonFootprint.impactLevel === "Average"
                              ? "#F59E0B"
                              : "#EF4444",
                    },
                  ]}
                >
                  <Text style={styles.impactLevelText}>
                    {carbonFootprint.impactLevel}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.carbonFootprintStats}>
            <View style={styles.carbonStat}>
              <MaterialIcons name="calendar-today" size={16} color="#64748B" />
              <Text style={styles.carbonStatText}>
                {new Date(carbonFootprint.timestamp * 1000).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  },
                )}
              </Text>
            </View>
            <View style={styles.carbonStat}>
              <MaterialIcons name="park" size={16} color="#047857" />
              <Text style={styles.carbonStatText}>
                {carbonFootprint.treesNeeded} trees/year
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.viewHistoryButton}
            onPress={() => router.push("/Screens/CarbonFootprintHistory")}
          >
            <Text style={styles.viewHistoryText}>View Full History</Text>
            <MaterialIcons name="chevron-right" size={20} color="#047857" />
          </Pressable>
        </View>
      )}

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
                  {
                    backgroundColor: achievement.unlocked
                      ? achievement.color
                      : "#E2E8F0",
                  },
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
                {/* Delete button - only show on own profile */}
                {isOwnProfile && (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePost(post._id)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color="#fff"
                    />
                  </Pressable>
                )}
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>First Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.firstName}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, firstName: text })
                  }
                  placeholder="Enter first name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Last Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.lastName}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, lastName: text })
                  }
                  placeholder="Enter last name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date of Birth</Text>
                <Pressable
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color="#047857"
                  />
                  <Text style={styles.datePickerText}>
                    {editForm.dateOfBirth.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </Pressable>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={editForm.dateOfBirth}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  isUpdating && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#047857",
    position: "relative",
  },
  coverGradient: {
    flex: 1,
    backgroundColor: "linear-gradient(135deg, #047857 0%, #8B5CF6 100%)",
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
    backgroundColor: "#047857",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#047857",
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
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
  },
  ecoPointsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: "#047857",
    borderRadius: 24,
    shadowColor: "#047857",
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
  carbonFootprintCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E6F4F1",
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  carbonFootprintHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  carbonFootprintIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
  },
  carbonFootprintInfo: {
    flex: 1,
  },
  carbonFootprintLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 6,
  },
  carbonFootprintScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  carbonFootprintValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  impactLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  impactLevelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  carbonFootprintStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  carbonStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  carbonStatText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  viewHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#F8F9FE",
    borderRadius: 12,
  },
  viewHistoryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857",
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
    color: "#047857",
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
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default Profile;
