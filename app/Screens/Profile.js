// User profile screen showing personal data, achievements, and submitted posts.
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ActivityIndicator,
    Alert,
    Image,
    LayoutAnimation,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
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

const LEVEL_THRESHOLDS = [
  0,
  100,
  250,
  450,
  700,
  1000,
  1350,
  1750,
  2200,
  2700,
];

const getLevelData = (ecoPoints) => {
  // Profile level progress is derived locally from stored eco points so the UI can react instantly.
  const points = Math.max(0, Number(ecoPoints) || 0);
  const maxLevel = LEVEL_THRESHOLDS.length;

  let currentLevel = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      currentLevel = i + 1;
    } else {
      break;
    }
  }

  const isMaxLevel = currentLevel >= maxLevel;
  const previousLevelPoints = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextLevelPoints = isMaxLevel
    ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
    : LEVEL_THRESHOLDS[currentLevel];
  const pointsIntoLevel = points - previousLevelPoints;
  const pointsNeededForLevel = isMaxLevel
    ? 0
    : nextLevelPoints - previousLevelPoints;
  const levelProgress = isMaxLevel
    ? 1
    : Math.min(1, pointsIntoLevel / pointsNeededForLevel);

  return {
    currentLevel,
    nextLevelPoints,
    previousLevelPoints,
    pointsIntoLevel,
    pointsNeededForLevel,
    levelProgress,
    isMaxLevel,
  };
};

const formatMemberSince = (timestamp) => {
  if (!timestamp) return null;

  const normalizedTimestamp =
    typeof timestamp === "number" && timestamp < 1e12
      ? timestamp * 1000
      : timestamp;
  const date = new Date(normalizedTimestamp);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const Profile = ({ userData, onRefresh, viewingUserId = null }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [viewingUserData, setViewingUserData] = useState(null);
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
  const [isPhotoActionLoading, setIsPhotoActionLoading] = useState(false);
  const [photoActionMessage, setPhotoActionMessage] = useState("");
  const [expandedAchievement, setExpandedAchievement] = useState(null);
  const [activePostMenuId, setActivePostMenuId] = useState(null);

  // Check if viewing own profile or another user's profile
  const currentUserIdentifier = userData?.mobile || userData?.email || null;
  const isOwnProfile =
    !viewingUserId || currentUserIdentifier === viewingUserId;

  useEffect(() => {
    if (viewingUserId && !isOwnProfile) {
      // Profile can be reused both for the logged-in user and for viewing another community member.
      loadViewingUserData();
    } else if (userData) {
      loadUserPosts();
      loadAchievements();
    }
  }, [userData, viewingUserId]);

  const loadAchievements = async (targetIdentifier = null) => {
    try {
      // Achievements follow the same identifier fallback pattern as the rest of the app.
      const identifier =
        targetIdentifier ||
        userData?.mobile ||
        userData?.email ||
        (await AsyncStorage.getItem("mobile")) ||
        (await AsyncStorage.getItem("email"));
      const response = await fetch(`${BASE_URL}/user/${identifier}/achievements`);
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
      // Viewing another user's profile first loads their base profile, then their achievements and posts.
      const response = await fetch(
        `${BASE_URL}/user/by-identifier/${viewingUserId}`,
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setViewingUserData(result.user);
        loadAchievements(viewingUserId);
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
      // Target identifier lets the same function serve both personal profile and public profile views.
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
    // Stats stay lightweight here: post count is derived from loaded posts, while eco points come from user data.
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
        await loadAchievements();
        if (onRefresh) await onRefresh();
      }
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeletePost = (postId) => {
    setActivePostMenuId(null);
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

  const handleOpenPost = (postId) => {
    if (!postId) return;
    router.push(`/Screens/PostDetail?postId=${postId}`);
  };

  const togglePostMenu = (postId) => {
    setActivePostMenuId((currentId) => (currentId === postId ? null : postId));
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
    if (isPhotoActionLoading) {
      return;
    }

    const photoOptions = [
      {
        text: "Choose from Gallery",
        onPress: () => pickImage(),
      },
    ];

    if (displayUser?.profilePicture) {
      photoOptions.push({
        text: "Remove Photo",
        onPress: () => removePhoto(),
        style: "destructive",
      });
    }

    photoOptions.push({
      text: "Cancel",
      style: "cancel",
    });

    Alert.alert(
      "Update Profile Photo",
      "Choose a new profile photo from your gallery or remove the current one.",
      photoOptions,
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Photo library permission is required",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
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
      setPhotoActionMessage("Updating profile photo...");
      setIsPhotoActionLoading(true);

      const storedIdentifier = await AsyncStorage.getItem("mobile");
      const identifier = userData?.mobile || userData?.email || storedIdentifier;

      if (!identifier) {
        Alert.alert("Error", "Unable to identify user");
        return;
      }

      const formData = new FormData();
      const isEmailUser = identifier.includes("@");
      formData.append(isEmailUser ? "email" : "mobile", identifier);

      const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = fileExtension === "png" ? "image/png" : "image/jpeg";

      const imageFile = {
        uri: imageUri,
        type: mimeType,
        name: `profile_${Date.now()}.${fileExtension}`,
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
          "Success",
          "Profile picture updated successfully",
          [{ text: "OK" }],
        );
        if (onRefresh) await onRefresh();
      } else {
        Alert.alert(
          "Update Failed",
          result.detail || "Failed to update profile photo.",
        );
      }
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      Alert.alert("Error", "Failed to upload profile photo");
    } finally {
      setIsPhotoActionLoading(false);
      setPhotoActionMessage("");
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
              setPhotoActionMessage("Removing profile photo...");
              setIsPhotoActionLoading(true);

              const storedIdentifier = await AsyncStorage.getItem("mobile");
              const identifier =
                userData?.mobile || userData?.email || storedIdentifier;

              if (!identifier) {
                Alert.alert("Error", "Unable to identify user");
                return;
              }

              const response = await fetch(
                `${BASE_URL}/delete-profile-picture/${encodeURIComponent(identifier)}`,
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
            } finally {
              setIsPhotoActionLoading(false);
              setPhotoActionMessage("");
            }
          },
        },
      ],
    );
  };


  const ecoPoints = stats.ecoPoints || 0;
  const displayUser = isOwnProfile ? userData : viewingUserData;
  const {
    currentLevel: derivedLevel,
    nextLevelPoints,
    pointsIntoLevel,
    pointsNeededForLevel,
    levelProgress,
    isMaxLevel,
  } = getLevelData(ecoPoints);
  const currentLevel = displayUser?.level || derivedLevel;
  const levelTitle =
    ecoPoints >= 300
      ? "Cool The Globe Contributor"
      : ecoPoints >= 150
        ? "Earth Defender"
        : "Eco Explorer";
  const profileContact = isOwnProfile
    ? userData?.email || userData?.mobile
    : null;
  const joinedSince = formatMemberSince(displayUser?.createdAt);
  const totalCo2Saved = Number(displayUser?.totalCO2Offset || 0);
  const postsSectionTitle = isOwnProfile ? "My Posts" : "Posts";
  const postsSectionSubtitle = `${userPosts.length} photos shared`;
  const emptyStateSubtext = isOwnProfile
    ? "Share your eco-actions to inspire others!"
    : "This user has not shared any posts yet.";
  const publicSubtitle = joinedSince
    ? "Public eco profile"
    : "Public eco profile";
  const formatCo2Saved = (value) => Number(value || 0).toFixed(2);
  const publicImpactText =
    totalCo2Saved > 0
      ? `Saved ${formatCo2Saved(totalCo2Saved)} kg of CO2 through eco actions`
      : "Building impact through everyday eco actions";
  const unlockedAchievements = achievements.filter((item) => item.unlocked);
  const ownHeroStatChips = [
    { icon: "local-fire-department", label: `${stats.ecoPoints} eco points` },
    { icon: "workspace-premium", label: `${unlockedAchievements.length} badges earned` },
  ];
  const publicHeroStatChips = [
    joinedSince
      ? { icon: "calendar-today", label: `Joined ${joinedSince}` }
      : null,
    { icon: "local-fire-department", label: `${stats.ecoPoints} eco points` },
  ].filter(Boolean);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 28) }}
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
          style={[
            styles.heroBackground,
            { paddingTop: Math.max(insets.top + 16, 60) },
          ]}
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

          <View
            style={[
              styles.heroCard,
              isOwnProfile ? styles.ownHeroCard : styles.publicHeroCard,
            ]}
          >
            <View style={styles.heroAvatarWrapper}>
              {displayUser?.profilePicture ? (
                <Image
                  source={{ uri: displayUser.profilePicture }}
                  style={styles.heroAvatar}
                />
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                  <MaterialIcons name="person" size={60} color="#fff" />
                </View>
              )}

              {isOwnProfile && (
                <Pressable
                  style={[
                    styles.heroEditAvatar,
                    isPhotoActionLoading && styles.heroEditAvatarDisabled,
                  ]}
                  onPress={handleProfilePhotoOptions}
                  disabled={isPhotoActionLoading}
                >
                  {isPhotoActionLoading ? (
                    <ActivityIndicator size="small" color="#047857" />
                  ) : (
                    <MaterialIcons name="camera-alt" size={18} color="#047857" />
                  )}
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.heroInfo,
                isOwnProfile ? styles.ownHeroInfo : styles.publicHeroInfo,
              ]}
            >
              <View style={styles.heroIdentityBlock}>
                <Text
                  style={[
                    styles.userName,
                    isOwnProfile ? styles.ownUserName : styles.publicUserName,
                  ]}
                >
                  {isOwnProfile
                    ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
                    : viewingUserData
                      ? `${viewingUserData.firstName} ${viewingUserData.lastName}`
                      : "Loading..."}
                </Text>
                {profileContact ? (
                  <Text
                    style={[
                      styles.userSubtitle,
                      isOwnProfile && styles.ownUserSubtitle,
                    ]}
                  >
                    {profileContact}
                  </Text>
                ) : (
                  <Text style={[styles.userSubtitle, styles.publicUserSubtitle]}>
                    {publicSubtitle}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.heroBadges,
                  isOwnProfile ? styles.ownHeroBadges : styles.publicHeroBadges,
                ]}
              >
                <View style={styles.levelBadge}>
                  <MaterialIcons name="emoji-events" size={16} color="#fff" />
                  <Text style={styles.levelBadgeText}>Level {currentLevel}</Text>
                </View>
                {isOwnProfile && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{levelTitle}</Text>
                  </View>
                )}
              </View>

              <View style={styles.publicMetaRow}>
                {(isOwnProfile ? ownHeroStatChips : publicHeroStatChips).map((chip) => (
                  <View
                    key={chip.label}
                    style={[styles.publicMetaChip, isOwnProfile && styles.ownMetaChip]}
                  >
                    <MaterialIcons name={chip.icon} size={14} color="#E6FFF5" />
                    <Text style={styles.publicMetaText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <Modal visible={isPhotoActionLoading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#047857" />
            <Text style={styles.loadingTitle}>Please wait</Text>
            <Text style={styles.loadingSubtitle}>
              {photoActionMessage || "Processing your profile photo..."}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.contentSection}>
        {isOwnProfile ? (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>Progress to next level</Text>
                  <Text style={styles.progressSubtitle}>{levelTitle}</Text>
                </View>
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>{Math.round(levelProgress * 100)}%</Text>
                </View>
              </View>
              <View style={styles.progressBarBackground}>
                <View
                  style={[styles.progressBarFill, { width: `${Math.round(levelProgress * 100)}%` }]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressMetaText}>
                  {isMaxLevel
                    ? `Max level reached at ${nextLevelPoints} points`
                    : `${pointsIntoLevel} / ${pointsNeededForLevel} points`}
                </Text>
                <Text style={styles.progressMetaText}>
                  {isMaxLevel ? "Top tier unlocked" : `Next milestone: ${nextLevelPoints}`}
                </Text>
              </View>
            </View>

            <View style={styles.ownOverviewCard}>
              <View style={styles.ownMetricRow}>
                <View style={styles.ownMetricLeft}>
                  <View style={styles.ownMetricIcon}>
                    <MaterialIcons name="grid-view" size={14} color="#047857" />
                  </View>
                  <Text style={styles.ownMetricLabel}>Posts</Text>
                </View>
                <Text style={styles.ownMetricValue}>{stats.posts}</Text>
              </View>
              <View style={styles.ownMetricDivider} />
              <View style={styles.ownMetricRow}>
                <View style={styles.ownMetricLeft}>
                  <View style={styles.ownMetricIcon}>
                    <MaterialIcons name="stars" size={14} color="#047857" />
                  </View>
                  <Text style={styles.ownMetricLabel}>Eco Points</Text>
                </View>
                <Text style={styles.ownMetricValue}>{stats.ecoPoints}</Text>
              </View>
              <View style={styles.ownMetricDivider} />
              <View style={styles.ownMetricRow}>
                <View style={styles.ownMetricLeft}>
                  <View style={styles.ownMetricIcon}>
                    <MaterialIcons name="workspace-premium" size={14} color="#047857" />
                  </View>
                  <Text style={styles.ownMetricLabel}>Badges</Text>
                </View>
                <Text style={styles.ownMetricValue}>
                  {achievements.filter((item) => item.unlocked).length}
                </Text>
              </View>
              <View style={styles.ownMetricDivider} />
              <View style={styles.ownMetricRow}>
                <View style={styles.ownMetricLeft}>
                  <View style={styles.ownMetricIcon}>
                    <MaterialIcons name="park" size={14} color="#047857" />
                  </View>
                  <Text style={styles.ownMetricLabel}>CO2 Saved</Text>
                </View>
                <Text style={styles.ownMetricValue}>{formatCo2Saved(totalCo2Saved)} kg</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.publicHighlightCard}>
              <View style={styles.publicHighlightHeader}>
                <MaterialIcons name="public" size={20} color="#047857" />
                <Text style={styles.publicHighlightTitle}>Community Impact</Text>
              </View>
              <Text style={styles.publicHighlightText}>{publicImpactText}</Text>
              <Text style={styles.publicHighlightSubtext}>
                {joinedSince
                  ? `Part of SafaStep since ${joinedSince}`
                  : "Part of the SafaStep eco community"}
              </Text>
            </View>

            <View style={styles.publicStatGrid}>
              <View style={styles.publicStatCard}>
                <View style={styles.publicStatTopRow}>
                  <View style={styles.publicStatIcon}>
                    <MaterialIcons name="grid-view" size={16} color="#047857" />
                  </View>
                  <Text style={styles.publicStatLabel}>Posts</Text>
                </View>
                <Text style={styles.publicStatValue}>{stats.posts}</Text>
              </View>
              <View style={styles.publicStatCard}>
                <View style={styles.publicStatTopRow}>
                  <View style={styles.publicStatIcon}>
                    <MaterialIcons name="stars" size={16} color="#047857" />
                  </View>
                  <Text style={styles.publicStatLabel}>Eco Points</Text>
                </View>
                <Text style={styles.publicStatValue}>{stats.ecoPoints}</Text>
              </View>
              <View style={styles.publicStatCardWide}>
                <View style={styles.publicStatWideTopRow}>
                  <View style={styles.publicStatIconWide}>
                    <MaterialIcons name="park" size={18} color="#047857" />
                  </View>
                  <View style={styles.publicStatWideContent}>
                    <Text style={styles.publicStatLabel}>CO2 Saved</Text>
                    <Text style={styles.publicStatValueWide}>{formatCo2Saved(totalCo2Saved)} kg</Text>
                  </View>
                </View>
                <Text style={styles.publicStatCaption}>Measured from verified eco actions and posts</Text>
              </View>
            </View>
          </>
        )}

        {isOwnProfile && (
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
        )}

        {!isOwnProfile && unlockedAchievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Unlocked Badges</Text>
                <Text style={styles.sectionSubtitle}>
                  {unlockedAchievements.length} badges earned
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.publicBadgesScroll}
            >
              {unlockedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.publicBadgeCard}>
                  {BADGE_IMAGES[achievement.id] ? (
                    <Image
                      source={BADGE_IMAGES[achievement.id]}
                      style={styles.publicBadgeImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.publicBadgeFallback}>
                      <MaterialIcons name="emoji-events" size={28} color="#047857" />
                    </View>
                  )}
                  <Text style={styles.publicBadgeTitle} numberOfLines={2}>
                    {achievement.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}




        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{postsSectionTitle}</Text>
              <Text style={styles.sectionSubtitle}>{postsSectionSubtitle}</Text>
            </View>
          </View>

          {userPosts.length > 0 ? (
            <View style={styles.postsGrid}>
              {userPosts.map((post) => (
                <Pressable
                  key={post._id}
                  style={styles.postCard}
                  onPress={() => handleOpenPost(post._id)}
                >
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {isOwnProfile && (
                    <View style={styles.postOverlay}>
                      <View style={styles.postStats}>
                        <MaterialIcons name="favorite" size={16} color="#fff" />
                        <Text style={styles.postStatText}>{post.likesCount}</Text>
                      </View>
                    </View>
                  )}

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
                    <>
                      <Pressable
                        style={styles.postMenuTrigger}
                        onPress={(event) => {
                          event.stopPropagation?.();
                          togglePostMenu(post._id);
                        }}
                      >
                        <MaterialIcons name="more-vert" size={18} color="#0F172A" />
                      </Pressable>

                      {activePostMenuId === post._id && (
                        <View style={styles.postMenuSheet}>
                          <Pressable
                            style={styles.postMenuItem}
                            onPress={() => handleDeletePost(post._id)}
                          >
                            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                            <Text style={styles.postMenuItemText}>Delete</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-library" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No posts yet</Text>
              <Text style={styles.emptyStateSubtext}>
                {emptyStateSubtext}
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
    paddingTop: 60,
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
  ownHeroCard: {
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  publicHeroCard: {
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 20,
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
  heroEditAvatarDisabled: {
    opacity: 0.8,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
  },
  heroInfo: {
    flex: 1,
  },
  ownHeroInfo: {
    width: "100%",
    marginTop: 16,
    alignItems: "center",
  },
  publicHeroInfo: {
    justifyContent: "center",
    width: "100%",
    marginLeft: 0,
    marginTop: 16,
    alignItems: "center",
  },
  heroIdentityBlock: {
    marginBottom: 6,
  },
  ownUserName: {
    textAlign: "center",
    fontSize: 17,
    lineHeight: 22,
  },
  ownUserSubtitle: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  publicUserName: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
  },
  publicUserSubtitle: {
    textAlign: "center",
    marginBottom: 10,
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
  ownHeroBadges: {
    justifyContent: "center",
    marginBottom: 0,
  },
  publicHeroBadges: {
    marginBottom: 8,
    justifyContent: "center",
  },
  publicMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    justifyContent: "center",
  },
  publicMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  ownMetaChip: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  publicMetaText: {
    color: "#E6FFF5",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
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
    paddingTop: 24,
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 22,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  progressSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  progressPill: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  progressPillText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#047857",
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
  publicHighlightCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F3FBF8",
    borderWidth: 1,
    borderColor: "#CFEFE3",
  },
  publicHighlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  publicHighlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginLeft: 8,
  },
  publicHighlightText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: "#166534",
  },
  publicHighlightSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 6,
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
  ownOverviewCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  ownMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  ownMetricLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ownMetricDivider: {
    height: 1,
    backgroundColor: "#EEF2F7",
  },
  ownMetricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  ownMetricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  ownMetricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  publicStatGrid: {
    marginHorizontal: 20,
    marginBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  publicStatCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 92,
    marginBottom: 12,
    justifyContent: "space-between",
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  publicStatCardWide: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 0,
    minHeight: 84,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  publicStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  publicStatWideTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  publicStatWideContent: {
    marginLeft: 10,
    flex: 1,
  },
  publicStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  publicStatIconWide: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  publicStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  publicStatValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 10,
  },
  publicStatValueWide: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  publicStatCaption: {
    fontSize: 11,
    lineHeight: 15,
    color: "#64748B",
    marginTop: 6,
    maxWidth: "100%",
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
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  summaryAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
  },
  summaryActionText: {
    color: "#047857",
    fontWeight: "700",
    fontSize: 13,
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
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
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
  publicBadgesScroll: {
    paddingVertical: 4,
    paddingLeft: 20,
    paddingRight: 20,
  },
  publicBadgeCard: {
    width: 92,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  publicBadgeImage: {
    width: 44,
    height: 44,
    marginBottom: 8,
  },
  publicBadgeFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  publicBadgeTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
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
    gap: 12,
  },
  postCard: {
    width: "48%",
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
  postMenuTrigger: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  postMenuSheet: {
    position: "absolute",
    top: 48,
    right: 8,
    minWidth: 110,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  postMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFF7F7",
  },
  postMenuItemText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
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
