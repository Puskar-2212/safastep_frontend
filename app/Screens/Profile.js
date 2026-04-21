import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
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
    Animated,
    LayoutAnimation,
    UIManager,
} from "react-native";
import { BASE_URL } from "../../constants/config";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Badge images mapping - all badges as PNG
const BADGE_IMAGES = {
  eco_starter: require("../../assets/badges/Eco_starter.png"),
  eco_enthusiast: require("../../assets/badges/Eco_enthusiast.png"),
  eco_champion: require("../../assets/badges/Eco_champion.png"),
  first_step: require("../../assets/badges/first_step.png"),
  eco_contributor: require("../../assets/badges/Eco_contributor.png"),
  eco_influencer: require("../../assets/badges/Eco_influencer.png"),
};

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
  const [achievements, setAchievements] = useState([]);

  // Edit profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedAchievement, setExpandedAchievement] = useState(null);

  // Check if viewing own profile or another user's profile
  const isOwnProfile = !viewingUserId || userData?.mobile === viewingUserId;

  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      // Load other user's data
      loadViewingUserData();
    } else if (userData) {
      loadUserPosts();
      loadCarbonFootprint();
      loadAchievements();
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

  const loadAchievements = async () => {
    try {
      const mobile = userData?.mobile || (await AsyncStorage.getItem("mobile"));
      const response = await fetch(`${BASE_URL}/user/${mobile}/achievements`);
      const result = await response.json();

      if (response.ok && result.success) {
        setAchievements(result.achievements);
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
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

  // Debug function to log current state
  const debugCurrentState = () => {
    console.log("=== DEBUG PROFILE STATE ===");
    console.log("userData:", userData);
    console.log("userPosts count:", userPosts.length);
    console.log(
      "userPosts IDs:",
      userPosts.map((p) => p._id),
    );
    console.log("isOwnProfile:", isOwnProfile);
    console.log("viewingUserId:", viewingUserId);
    console.log("========================");
  };

  const loadUserPosts = async (targetMobile = null) => {
    try {
      // Use targetMobile if provided (viewing other user), otherwise use own identifier
      const identifier =
        targetMobile ||
        userData?.mobile ||
        userData?.email ||
        (await AsyncStorage.getItem("mobile")) ||
        (await AsyncStorage.getItem("email"));

      console.log("Loading posts for identifier:", identifier); // Debug log

      const response = await fetch(
        `${BASE_URL}/posts/user/${identifier}?_t=${Date.now()}`,
      );
      const result = await response.json();

      if (response.ok && result.success) {
        console.log(
          `Loaded ${result.posts.length} posts for user ${identifier}`,
        ); // Debug log
        setUserPosts(result.posts);
      } else {
        console.error("Failed to load posts:", result);
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
    try {
      if (viewingUserId && !isOwnProfile) {
        await loadViewingUserData();
      } else {
        // Clear local state first to force re-render
        setUserPosts([]);

        await loadUserPosts();
        await loadCarbonFootprint();
        if (onRefresh) await onRefresh();
      }
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
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
              (await AsyncStorage.getItem("mobile")) ||
              (await AsyncStorage.getItem("email"));

            if (!identifier) {
              Alert.alert("Error", "Unable to identify user");
              return;
            }

            // Check if identifier is email or mobile
            const paramName = identifier.includes("@") ? "email" : "mobile";

            console.log(
              `Deleting post ${postId} with ${paramName}: ${identifier}`,
            );

            const response = await fetch(
              `${BASE_URL}/posts/${postId}?${paramName}=${identifier}`,
              {
                method: "DELETE",
              },
            );

            const result = await response.json();

            if (response.ok && result.success) {
              Alert.alert("Success", "Post deleted successfully!");
              console.log(`Post ${postId} deleted successfully from server`);

              // Debug state before clearing
              debugCurrentState();

              // Clear all posts first to force re-render
              setUserPosts([]);

              // Wait a moment for state to clear
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Force refresh posts from server to ensure consistency
              console.log("Refreshing posts from server...");
              await loadUserPosts();

              // Debug state after refresh
              setTimeout(() => {
                debugCurrentState();
              }, 500);

              // Also refresh user data if available
              if (onRefresh) {
                console.log("Calling onRefresh...");
                await onRefresh();
              }

              // Force a manual refresh as well
              await handleRefresh();
            } else {
              console.error("Delete failed:", result);
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


  const ecoPoints = stats.ecoPoints || 0;
  const currentLevel = Math.max(1, Math.floor(ecoPoints / 100) + 1);
  const nextLevelPoints = currentLevel * 100;
  const previousLevelPoints = (currentLevel - 1) * 100;
  const levelProgress = nextLevelPoints
    ? Math.min(1, (ecoPoints - previousLevelPoints) / (nextLevelPoints - previousLevelPoints))
    : 0;
  const levelTitle =
    ecoPoints >= 300
      ? "Cool The Globe Contributor"
      : ecoPoints >= 150
        ? "Earth Defender"
        : "Eco Explorer";
  const profileContact = isOwnProfile
    ? userData?.email || userData?.mobile
    : viewingUserData?.email || viewingUserData?.mobile;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={["#047857", "#065F46"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBackground}
        >
          <View style={styles.headerRow}>

            <Pressable
              style={styles.headerButton}
              onPress={isOwnProfile ? handleSettingsMenu : () => router.back()}
            >
              <MaterialIcons
                name={isOwnProfile ? "settings" : "arrow-back"}
                size={22}
                color="#fff"
              />
            </Pressable>
            {isOwnProfile && (
              <Pressable
                style={[styles.headerButton, { marginLeft: 12 }]}
                onPress={handleEditProfile}
              >
                <MaterialIcons name="edit" size={22} color="#fff" />
              </Pressable>
            )}
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroAvatarWrapper}>
              {isOwnProfile && userData?.profilePicture ? (
                <Image
                  source={{ uri: userData.profilePicture }}
                  style={styles.heroAvatar}
                />
              ) : isOwnProfile ? (
                <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                  <MaterialIcons name="person" size={60} color="#fff" />
                </View>
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                  <MaterialIcons name="person" size={60} color="#fff" />
                </View>
              )}

              {isOwnProfile && (
                <Pressable
                  style={styles.heroEditAvatar}
                  onPress={handleProfilePhotoOptions}
                >
                  <MaterialIcons name="camera-alt" size={18} color="#047857" />
                </Pressable>
              )}
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.userName}>
                {isOwnProfile
                  ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
                  : viewingUserData
                    ? `${viewingUserData.firstName} ${viewingUserData.lastName}`
                    : "Loading..."}
              </Text>
              {profileContact ? (
                <Text style={styles.userSubtitle}>{profileContact}</Text>
              ) : (
                <Text style={styles.userSubtitle}>SafaStep Eco Member</Text>
              )}
              <View style={styles.heroBadges}>
                <View style={styles.levelBadge}>
                  <MaterialIcons name="emoji-events" size={16} color="#fff" />
                  <Text style={styles.levelBadgeText}>Level {currentLevel}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{levelTitle}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Progress to next level</Text>
              <Text style={styles.progressSubtitle}>{levelTitle}</Text>
            </View>
            <Text style={styles.progressValue}>{Math.round(levelProgress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[styles.progressBarFill, { width: `${Math.round(levelProgress * 100)}%` }]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>
              {ecoPoints - previousLevelPoints} / {nextLevelPoints - previousLevelPoints} points
            </Text>
            <Text style={styles.progressMetaText}>Next milestone: {nextLevelPoints}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statSmallLabel}>Posts</Text>
            <Text style={styles.statLargeValue}>{stats.posts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statSmallLabel}>Eco Points</Text>
            <Text style={styles.statLargeValue}>{stats.ecoPoints}</Text>
          </View>
        </View>

        {isOwnProfile && carbonFootprint && (
          <View style={[styles.summaryRow, styles.summaryRowSingle]}>
            <View style={[styles.summaryCard, styles.summaryCardFull]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.summaryIconRow}>
                  <MaterialIcons name="cloud" size={24} color="#047857" />
                  <Text style={styles.summaryTitle}>Carbon Footprint</Text>
                </View>
                <Pressable
                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 16 }}
                  onPress={() => router.push('/Screens/CarbonFootprintHistory')}
                >
                  <Text style={{ color: '#047857', fontWeight: '700', fontSize: 13 }}>View History</Text>
                </Pressable>
              </View>
              <Text style={styles.carbonFootprintValueCard}>
                {carbonFootprint.totalCO2} kg/day
              </Text>
              <View style={styles.carbonCardChips}>
                <View style={styles.carbonChip}>
                  <MaterialIcons name="park" size={14} color="#047857" />
                  <Text style={styles.carbonChipText}>{carbonFootprint.treesNeeded} trees/year</Text>
                </View>
                <View style={styles.carbonChip}>
                  <MaterialIcons name="calendar-today" size={14} color="#047857" />
                  <Text style={styles.carbonChipText}>
                    {new Date(carbonFootprint.timestamp * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
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
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.sectionSubtitle}>
                {achievements.filter((item) => item.unlocked).length} unlocked
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            {achievements.map((achievement) => {
              const isExpanded = expandedAchievement === achievement.id;
              return (
                <Pressable
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.unlocked ? styles.achievementCardActive : styles.achievementCardLocked,
                    isExpanded && styles.achievementCardExpanded,
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandedAchievement(isExpanded ? null : achievement.id);
                  }}
                >
                  {BADGE_IMAGES[achievement.id] ? (
                    <Image
                      source={BADGE_IMAGES[achievement.id]}
                      style={styles.achievementBadgeImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.achievementIconPlaceholder}>
                      <MaterialIcons 
                        name="emoji-events" 
                        size={64} 
                        color={achievement.unlocked ? "#047857" : "#CBD5E1"} 
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.achievementTitle,
                      !achievement.unlocked && styles.achievementTitleLocked,
                    ]}
                  >
                    {achievement.name}
                  </Text>
                  
                  {isExpanded && (
                    <>
                      <Text
                        style={[
                          styles.achievementDescription,
                          !achievement.unlocked && styles.achievementDescriptionLocked,
                        ]}
                      >
                        {achievement.description}
                      </Text>
                      {achievement.unlocked ? (
                        <View style={styles.achievementStatus}>
                          <MaterialIcons name="check-circle" size={16} color="#047857" />
                          <Text style={styles.achievementStatusText}>Unlocked!</Text>
                        </View>
                      ) : (
                        <View style={styles.achievementStatusLocked}>
                          <MaterialIcons name="lock" size={16} color="#94A3B8" />
                          <Text style={styles.achievementStatusTextLocked}>Locked</Text>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>




        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>My Posts</Text>
              <Text style={styles.sectionSubtitle}>{userPosts.length} photos shared</Text>
            </View>
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

                  {post.verificationStatus === "pending_review" && (
                    <View style={styles.statusBadge}>
                      <MaterialIcons name="schedule" size={10} color="#F59E0B" />
                      <Text style={styles.statusBadgeText}>Pending</Text>
                    </View>
                  )}
                  {post.verificationStatus === "rejected" && (
                    <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                      <MaterialIcons name="close" size={10} color="#EF4444" />
                      <Text style={[styles.statusBadgeText, styles.statusBadgeTextRejected]}>
                        Rejected
                      </Text>
                    </View>
                  )}
                  {post.verificationStatus === "error" && (
                    <View style={[styles.statusBadge, styles.statusBadgeError]}>
                      <MaterialIcons name="error" size={10} color="#DC2626" />
                      <Text style={[styles.statusBadgeText, styles.statusBadgeTextError]}>
                        Error
                      </Text>
                    </View>
                  )}

                  {isOwnProfile && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeletePost(post._id)}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="#fff" />
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
      </View>

      <View style={styles.bottomPadding} />

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
    backgroundColor: "#F8FAFC",
  },
  heroSection: {
    backgroundColor: "#047857",
  },
  heroBackground: {
    paddingBottom: 24,
    paddingTop: 44,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  heroAvatarWrapper: {
    position: "relative",
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "#047857",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  heroAvatarFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  heroEditAvatar: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#047857",
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  userSubtitle: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 14,
    marginBottom: 12,
  },
  heroBadges: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  editProfileButtonText: {
    marginLeft: 8,
    color: "#047857",
    fontWeight: "700",
    fontSize: 14,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 10,
  },
  levelBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 10,
  },
  roleBadgeText: {
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 12,
  },
  contentSection: {
    paddingTop: 20,
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  progressSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#047857",
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#047857",
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressMetaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statRow: {
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  statSmallLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 8,
  },
  statLargeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  summaryRow: {
    marginHorizontal: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryRowSingle: {
    justifyContent: "center",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  summaryCardFull: {
    width: "100%",
  },
  summaryIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "700",
    marginLeft: 10,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  summaryCaption: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },
  carbonFootprintValueCard: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 14,
  },
  carbonCardChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  carbonChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
    marginRight: 10,
  },
  carbonChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  impactLevelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },
  impactLevelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
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
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },
  achievementsScroll: {
    paddingVertical: 4,
    paddingLeft: 20,
    paddingRight: 20,
  },
  achievementCard: {
    width: 140,
    minHeight: 140,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  achievementCardExpanded: {
    width: 180,
    minHeight: 200,
  },
  achievementCardActive: {
    borderWidth: 1,
    borderColor: "rgba(4, 120, 87, 0.15)",
  },
  achievementCardLocked: {
    opacity: 0.65,
    backgroundColor: "#F8FAFC",
  },
  achievementBadgeImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  achievementIconPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  achievementTitleLocked: {
    color: "#94A3B8",
  },
  achievementDescription: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
  },
  achievementDescriptionLocked: {
    color: "#CBD5E1",
  },
  achievementStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },
  achievementStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
    marginLeft: 4,
  },
  achievementStatusLocked: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },
  achievementStatusTextLocked: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginLeft: 4,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  postCard: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 16,
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
  },
  postStatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 4,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: "70%",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
    letterSpacing: 0.1,
    marginLeft: 4,
  },
  statusBadgeRejected: {
    backgroundColor: "rgba(254, 242, 242, 0.95)",
  },
  statusBadgeTextRejected: {
    color: "#EF4444",
  },
  statusBadgeError: {
    backgroundColor: "rgba(254, 226, 226, 0.95)",
  },
  statusBadgeTextError: {
    color: "#DC2626",
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    justifyContent: "center",
    alignItems: "center",
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
    height: 90,
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
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: "row",
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
    marginRight: 12,
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
