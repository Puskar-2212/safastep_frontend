import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Linking,
    Modal,
    PanResponder,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import AnnouncementCard from "../../components/AnnouncementCard";
import { BASE_URL } from "../../constants/config";
import CO2CalculatorLanding from "../Screens/CO2CalculatorLanding";
import CreatePost from "../Screens/CreatePost";
import ExploreMap from "../Screens/ExploreMap";
import Profile from "../Screens/Profile";

const Homepage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [highlightedAnnouncementId, setHighlightedAnnouncementId] =
    useState(null);
  const announcementRefs = useRef({});
  const scrollViewRef = useRef(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => showMenu,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond when menu is open and swiping left
        return showMenu && gestureState.dx < -10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (showMenu && gestureState.dx < 0) {
          // Closing: swipe left when menu is open
          const newValue = Math.max(-280, gestureState.dx);
          slideAnim.setValue(newValue);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (showMenu && gestureState.dx < -100) {
          // Close menu if swiped left more than 100px
          closeMenu();
        } else if (showMenu) {
          // Snap back to open state
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const openMenu = () => {
    setShowMenu(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowMenu(false));
  };

  useEffect(() => {
    loadUserData();
    loadPosts();
    loadAnnouncements();
    checkIfFirstTime();
    fetchUnreadCount();

    // Check if we need to highlight a specific announcement
    if (params.announcementId) {
      setHighlightedAnnouncementId(params.announcementId);
      setActiveTab("home"); // Make sure we're on home tab
    }

    // Check if we need to navigate to explore tab with a location
    if (params.tab === "explore") {
      setActiveTab("explore");
      // Don't set selectedLocation - let ExploreMap handle it via params
    }

    // Auto-refresh notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(notificationInterval);
  }, []);

  const checkIfFirstTime = async () => {
    try {
      const hasLoggedInBefore = await AsyncStorage.getItem("hasLoggedInBefore");
      if (!hasLoggedInBefore) {
        // First time user
        setIsFirstTimeUser(true);
        await AsyncStorage.setItem("hasLoggedInBefore", "true");
      } else {
        // Returning user
        setIsFirstTimeUser(false);
      }

      // Show banner for 2 seconds
      setShowWelcomeBanner(true);
      setTimeout(() => {
        setShowWelcomeBanner(false);
      }, 2000);
    } catch (error) {
      console.error("Error checking first time user:", error);
    }
  };

  const loadUserData = async () => {
    try {
      // Get identifier (mobile or email) from params or AsyncStorage
      let identifier = params.mobile || (await AsyncStorage.getItem("mobile"));

      if (!identifier) {
        router.push("/Screens/Login");
        return;
      }

      // Use the new endpoint that works with both mobile and email
      const response = await fetch(
        `${BASE_URL}/user/by-identifier/${identifier}`,
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setUserData(result.user);
        await AsyncStorage.setItem("mobile", identifier); // Store identifier (works for both mobile and email)
      } else {
        Alert.alert("Error", "Failed to load user data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");

      // Fetch posts from backend with userId to check liked status
      const response = await fetch(`${BASE_URL}/posts?userId=${mobile}`);
      const result = await response.json();

      if (response.ok && result.success) {
        // Transform backend posts to match frontend format
        const transformedPosts = result.posts.map((post) => {
          // Calculate time ago
          const timeAgo = getTimeAgo(post.createdAt);

          return {
            id: post._id,
            user: {
              name: post.userName,
              avatar: post.userProfilePicture,
            },
            image: { uri: post.imageUrl },
            caption: post.caption,
            description: post.caption,
            impact: {
              category: post.category,
              co2: post.co2Offset ? `${post.co2Offset} kg` : "0 kg",
              ecoPoints: post.ecoPoints || 0,
            },
            likes: post.likesCount,
            comments: post.commentsCount,
            timeAgo: timeAgo,
            liked: post.liked, // Now comes from backend
            categoryId: post.categoryId,
            mobile: post.mobile,
            email: post.email,
            identifier: post.identifier,
          };
        });

        setPosts(transformedPosts);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      // Keep empty array on error
      setPosts([]);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await fetch(`${BASE_URL}/posts/announcements?limit=20`);
      const result = await response.json();

      if (response.ok && result.success) {
        setAnnouncements(result.announcements);

        // If we have a highlighted announcement, scroll to it after a short delay
        if (highlightedAnnouncementId) {
          setTimeout(() => {
            scrollToAnnouncement(highlightedAnnouncementId);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
      setAnnouncements([]);
    }
  };

  const scrollToAnnouncement = (announcementId) => {
    const ref = announcementRefs.current[announcementId];
    if (ref && scrollViewRef.current) {
      ref.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 20, animated: true });
          // Clear highlight after 3 seconds
          setTimeout(() => {
            setHighlightedAnnouncementId(null);
          }, 3000);
        },
        () => console.log("Failed to measure announcement position"),
      );
    }
  };

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  const fetchUnreadCount = async () => {
    try {
      const identifier = await AsyncStorage.getItem("mobile");
      if (!identifier) return;

      const response = await fetch(
        `${BASE_URL}/notifications/${identifier}/unread-count`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadPosts();
    loadAnnouncements();
    fetchUnreadCount(); // Also refresh notification count
  };

  const handleLike = async (postId) => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const email = await AsyncStorage.getItem("email");
      const identifier = mobile || email;

      if (!identifier) {
        Alert.alert("Error", "Please log in to like posts");
        return;
      }

      const formData = new FormData();

      // Check if identifier is email or mobile
      if (identifier.includes("@")) {
        formData.append("email", identifier);
      } else {
        formData.append("mobile", identifier);
      }

      console.log(`Liking post ${postId} with identifier: ${identifier}`);

      const response = await fetch(`${BASE_URL}/posts/${postId}/like`, {
        method: "POST",
        body: formData,
      });

      console.log(`Like response status: ${response.status}`);
      console.log(`Like response headers:`, response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Like request failed: ${response.status} - ${errorText}`);
        Alert.alert("Error", "Failed to like post");
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state
        setPosts(
          posts.map((post) =>
            post.id === postId
              ? { ...post, liked: result.liked, likes: result.likesCount }
              : post,
          ),
        );
      } else {
        console.error("Like failed:", result);
        Alert.alert("Error", result.detail || "Failed to like post");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      Alert.alert("Error", "Failed to like post");
    }
  };

  const handleShare = (post) => {
    setSelectedPost(post);
    setShareModalVisible(true);
  };

  const shareToWhatsApp = async () => {
    if (!selectedPost) return;

    const imageUrl = selectedPost.image.uri;
    const message = `Check out this eco-action on SafaStep! 🌱\n\n${selectedPost.user.name} saved ${selectedPost.impact.co2} by ${selectedPost.impact.category}.\n\n"${selectedPost.caption}"\n\n${imageUrl}\n\nJoin SafaStep and track your environmental impact!`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        setShareModalVisible(false);
      } else {
        Alert.alert("Error", "WhatsApp is not installed on your device");
      }
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      Alert.alert("Error", "Failed to share to WhatsApp");
    }
  };

  const shareToFacebook = async () => {
    if (!selectedPost) return;

    const imageUrl = selectedPost.image.uri;
    const message = `Check out this eco-action on SafaStep! 🌱\n\n${selectedPost.user.name} saved ${selectedPost.impact.co2} by ${selectedPost.impact.category}.\n\n"${selectedPost.caption}"\n\n${imageUrl}\n\nJoin SafaStep and track your environmental impact!`;

    // Try Facebook Messenger with text message
    const messengerUrl = `fb-messenger://share?text=${encodeURIComponent(message)}`;

    try {
      const messengerSupported = await Linking.canOpenURL(messengerUrl);
      if (messengerSupported) {
        await Linking.openURL(messengerUrl);
        setShareModalVisible(false);
      } else {
        // If Messenger not installed, show alert with options
        Alert.alert(
          "Share to Facebook",
          "Facebook Messenger is not installed. Would you like to copy the message and open Facebook?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setShareModalVisible(false),
            },
            {
              text: "Copy & Open Facebook",
              onPress: async () => {
                try {
                  // Try to open Facebook app
                  const fbUrl = "fb://page";
                  const fbSupported = await Linking.canOpenURL(fbUrl);

                  if (fbSupported) {
                    await Linking.openURL(fbUrl);
                  } else {
                    // Open Facebook website
                    await Linking.openURL("https://www.facebook.com");
                  }

                  Alert.alert(
                    "Message Copied!",
                    "The message has been copied. You can paste it in Facebook Messenger or as a post.",
                  );
                  setShareModalVisible(false);
                } catch (error) {
                  console.error("Error opening Facebook:", error);
                  Alert.alert("Error", "Failed to open Facebook");
                  setShareModalVisible(false);
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error sharing to Facebook:", error);
      Alert.alert("Error", "Failed to share to Facebook");
    }
  };

  const handleDeletePost = (postId, postOwner) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const identifier = await AsyncStorage.getItem("mobile");

            // Check if user owns this post
            if (identifier !== postOwner) {
              Alert.alert("Error", "You can only delete your own posts");
              return;
            }

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
              setPosts(posts.filter((post) => post.id !== postId));
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

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("mobile");
            await AsyncStorage.removeItem("email");
            await AsyncStorage.removeItem("hasLoggedInBefore");
            router.replace("/Screens/Login");
          } catch (error) {
            console.error("Error logging out:", error);
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const handlePostCreated = () => {
    setShowCreatePost(false);
    loadPosts(); // Reload posts to show the new one
    loadUserData(); // Reload user data to update eco points
  };

  const handleViewLocation = (location) => {
    console.log("handleViewLocation called with:", location);
    // Store the selected location and switch to explore tab
    setSelectedLocation(location);
    setActiveTab("explore");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === "profile") {
      return <Profile userData={userData} onRefresh={loadUserData} />;
    }

    if (activeTab === "calculator") {
      return <CO2CalculatorLanding />;
    }

    if (activeTab === "explore") {
      console.log(
        "Rendering ExploreMap with selectedLocation:",
        selectedLocation,
      );
      return (
        <ExploreMap
          selectedLocation={selectedLocation}
          onLocationViewed={() => setSelectedLocation(null)}
        />
      );
    }

    // Default Home Feed
    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Banner - Show on every login with different message */}
        {showWelcomeBanner && userData && (
          <Animatable.View
            animation="fadeInDown"
            duration={600}
            style={styles.welcomeBanner}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>
                {isFirstTimeUser
                  ? `Welcome, ${userData.firstName}! 👋`
                  : `Welcome back, ${userData.firstName}! 👋`}
              </Text>
              <Text style={styles.bannerSubtitle}>
                Discover eco-actions from your community
              </Text>
            </View>
            <View style={styles.bannerIcon}>
              <MaterialIcons name="eco" size={40} color="#fff" />
            </View>
          </Animatable.View>
        )}

        {/* Posts Grid */}
        <View style={styles.postsContainer}>
          {/* Announcements */}
          {announcements.map((announcement) => (
            <View
              key={announcement._id}
              ref={(ref) => (announcementRefs.current[announcement._id] = ref)}
              collapsable={false}
            >
              <AnnouncementCard
                announcement={announcement}
                onViewLocation={handleViewLocation}
                isHighlighted={highlightedAnnouncementId === announcement._id}
              />
            </View>
          ))}

          {/* User Posts */}
          {posts.map((post, index) => {
            const currentUserIdentifier = userData?.mobile || userData?.email;
            const postOwnerIdentifier =
              post.identifier || post.mobile || post.email;
            const isOwnPost = currentUserIdentifier === postOwnerIdentifier;

            return (
              <Animatable.View
                key={post.id}
                animation="fadeInUp"
                duration={600}
                delay={index * 100}
                style={styles.linkedInCard}
              >
                {/* User Header */}
                <View style={styles.linkedInHeader}>
                  <Pressable
                    style={styles.linkedInHeaderContent}
                    onPress={() => {
                      if (!isOwnPost) {
                        router.push(
                          `/Screens/UserProfile?mobile=${encodeURIComponent(postOwnerIdentifier)}`,
                        );
                      }
                    }}
                  >
                    <View style={styles.linkedInAvatar}>
                      <MaterialIcons name="person" size={24} color="#fff" />
                    </View>
                    <View style={styles.linkedInAuthorInfo}>
                      <Text style={styles.linkedInAuthorName}>
                        {isOwnPost ? "You" : post.user.name}
                      </Text>
                      <Text style={styles.linkedInPostTime}>
                        {post.timeAgo}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Delete button - only show for user's own posts */}
                  {isOwnPost && (
                    <Pressable
                      style={styles.linkedInDeleteButton}
                      onPress={() =>
                        handleDeletePost(post.id, postOwnerIdentifier)
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#EF4444"
                      />
                    </Pressable>
                  )}
                </View>

                {/* Caption */}
                <Text style={styles.linkedInCaption} numberOfLines={3}>
                  {post.caption}
                </Text>

                {/* Image */}
                <Image
                  source={post.image}
                  style={styles.linkedInImage}
                  resizeMode="cover"
                />

                {/* Category Badge */}
                <View style={styles.linkedInCategoryContainer}>
                  <View style={styles.linkedInCategoryBadge}>
                    <MaterialIcons
                      name={
                        post.impact.category === "Transportation"
                          ? "directions-bus"
                          : post.impact.category === "Plantation"
                            ? "park"
                            : post.impact.category === "Recycling"
                              ? "recycling"
                              : post.impact.category === "Waste Management"
                                ? "delete-outline"
                                : post.impact.category === "Energy Conservation"
                                  ? "bolt"
                                  : "eco"
                      }
                      size={16}
                      color={
                        post.impact.category === "Transportation"
                          ? "#3B82F6"
                          : post.impact.category === "Plantation"
                            ? "#047857"
                            : post.impact.category === "Recycling"
                              ? "#8B5CF6"
                              : post.impact.category === "Waste Management"
                                ? "#F59E0B"
                                : post.impact.category === "Energy Conservation"
                                  ? "#EF4444"
                                  : "#047857"
                      }
                    />
                    <Text
                      style={[
                        styles.linkedInCategoryText,
                        {
                          color:
                            post.impact.category === "Transportation"
                              ? "#3B82F6"
                              : post.impact.category === "Plantation"
                                ? "#047857"
                                : post.impact.category === "Recycling"
                                  ? "#8B5CF6"
                                  : post.impact.category === "Waste Management"
                                    ? "#F59E0B"
                                    : post.impact.category ===
                                        "Energy Conservation"
                                      ? "#EF4444"
                                      : "#047857",
                        },
                      ]}
                    >
                      {post.impact.category}
                    </Text>
                  </View>
                </View>

                {/* Impact Stats */}
                <View style={styles.linkedInImpactContainer}>
                  <View style={styles.linkedInImpactBadge}>
                    <MaterialIcons name="cloud" size={18} color="#047857" />
                    <Text style={styles.linkedInImpactText}>
                      {post.impact.co2} CO₂
                    </Text>
                  </View>
                  {post.impact.trees && (
                    <View style={styles.linkedInImpactBadge}>
                      <MaterialIcons name="park" size={18} color="#047857" />
                      <Text style={styles.linkedInImpactText}>
                        {post.impact.trees} trees
                      </Text>
                    </View>
                  )}
                  {post.impact.waste && (
                    <View style={styles.linkedInImpactBadge}>
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color="#F59E0B"
                      />
                      <Text style={styles.linkedInImpactText}>
                        {post.impact.waste}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions Row */}
                <View style={styles.linkedInActions}>
                  <Pressable
                    style={styles.linkedInActionButton}
                    onPress={() => handleLike(post.id)}
                  >
                    <MaterialIcons
                      name={post.liked ? "favorite" : "favorite-border"}
                      size={22}
                      color={post.liked ? "#F43F5E" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.linkedInActionText,
                        post.liked && styles.linkedInActionTextLiked,
                      ]}
                    >
                      {post.likes}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.linkedInActionButton}
                    onPress={() => handleShare(post)}
                  >
                    <MaterialIcons name="share" size={20} color="#64748B" />
                    <Text style={styles.linkedInActionText}>Share</Text>
                  </Pressable>
                </View>
              </Animatable.View>
            );
          })}
        </View>

        <View style={styles.feedEnd}>
          <View style={styles.feedEndIcon}>
            <Image
              source={require("../../assets/images/safastep_logo.png")}
              style={styles.feedEndLogoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.feedEndText}>You're all caught up!</Text>
          <Text style={styles.feedEndSubtext}>
            Check back later for more inspiring eco-actions
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - Only show on home tab */}
      {activeTab === "home" && (
        <View style={styles.header}>
          <Pressable style={styles.menuButton} onPress={openMenu}>
            <MaterialIcons name="menu" size={26} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>SafaStep</Text>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIcon}
              onPress={() => {
                router.push("/Screens/Notifications");
                fetchUnreadCount(); // Refresh count when returning
              }}
            >
              <MaterialIcons
                name="notifications-none"
                size={26}
                color="#111827"
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Content - Don't wrap calculator in extra view */}
      {activeTab === "calculator" ? <CO2CalculatorLanding /> : renderContent()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable
          style={[styles.navItem, activeTab === "home" && styles.navItemActive]}
          onPress={() => setActiveTab("home")}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === "home" && styles.navIconContainerActive,
            ]}
          >
            <MaterialIcons
              name="home"
              size={26}
              color={activeTab === "home" ? "#047857" : "#94A3B8"}
            />
          </View>
          <Text
            style={[
              styles.navText,
              activeTab === "home" && styles.navTextActive,
            ]}
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.navItem,
            activeTab === "explore" && styles.navItemActive,
          ]}
          onPress={() => setActiveTab("explore")}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === "explore" && styles.navIconContainerActive,
            ]}
          >
            <MaterialIcons
              name="campaign"
              size={26}
              color={activeTab === "explore" ? "#047857" : "#94A3B8"}
            />
          </View>
          <Text
            style={[
              styles.navText,
              activeTab === "explore" && styles.navTextActive,
            ]}
          >
            Explore
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => setShowCreatePost(true)}
        >
          <View style={styles.addButton}>
            <MaterialIcons name="add" size={30} color="#fff" />
          </View>
          <Text style={[styles.navText, { marginTop: 2 }]}>Post</Text>
        </Pressable>

        <Pressable
          style={[
            styles.navItem,
            activeTab === "calculator" && styles.navItemActive,
          ]}
          onPress={() => setActiveTab("calculator")}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === "calculator" && styles.navIconContainerActive,
            ]}
          >
            <MaterialIcons
              name="eco"
              size={26}
              color={activeTab === "calculator" ? "#047857" : "#94A3B8"}
            />
          </View>
          <Text
            style={[
              styles.navText,
              activeTab === "calculator" && styles.navTextActive,
            ]}
          >
            CO₂ Calc
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.navItem,
            activeTab === "profile" && styles.navItemActive,
          ]}
          onPress={() => setActiveTab("profile")}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === "profile" && styles.navIconContainerActive,
            ]}
          >
            <MaterialIcons
              name={activeTab === "profile" ? "person" : "person-outline"}
              size={26}
              color={activeTab === "profile" ? "#047857" : "#94A3B8"}
            />
          </View>
          <Text
            style={[
              styles.navText,
              activeTab === "profile" && styles.navTextActive,
            ]}
          >
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Edge Swipe Detector - for opening menu */}
      {!showMenu && (
        <View {...panResponder.panHandlers} style={styles.edgeSwipeDetector} />
      )}

      {/* Side Menu Overlay - only shows when menu is open */}
      {showMenu && <Pressable style={styles.menuOverlay} onPress={closeMenu} />}

      {/* Menu Container - Always rendered for swipe gesture */}
      <Animated.View
        style={[
          styles.sideMenuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        pointerEvents={showMenu ? "auto" : "none"}
      >
        <View style={styles.sideMenu}>
          {/* Profile Section */}
          <View style={styles.menuProfileSection}>
            <View style={styles.menuAvatar}>
              <MaterialIcons name="person" size={40} color="#047857" />
            </View>
            <Text style={styles.menuProfileName}>
              {userData?.firstName} {userData?.lastName}
            </Text>
            <Pressable
              onPress={() => {
                setActiveTab("profile");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <Text style={styles.menuProfileLink}>View profile</Text>
            </Pressable>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                router.push("/Screens/Notifications");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="notifications" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>Notifications</Text>
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.notificationBadge,
                    {
                      position: "relative",
                      top: 0,
                      right: 0,
                      marginLeft: "auto",
                    },
                  ]}
                >
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                router.push("/Screens/Leaderboard");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="leaderboard" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>Leaderboard</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                router.push("/Screens/Challenges");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="emoji-events" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>Challenges</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setActiveTab("calculator");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="eco" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>CO₂ Calculator</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setActiveTab("explore");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="map" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>Explore Map</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                router.push("/Screens/Settings");
                setTimeout(() => closeMenu(), 100);
              }}
            >
              <MaterialIcons name="settings" size={24} color="#6b7280" />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
          </View>

          {/* Logout Button */}
          <View style={styles.menuFooter}>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <Pressable
          style={styles.shareModalOverlay}
          onPress={() => setShareModalVisible(false)}
        >
          <Pressable
            style={styles.shareModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.shareModalTitle}>Share Eco-Action</Text>

            <Pressable style={styles.shareOption} onPress={shareToWhatsApp}>
              <View
                style={[
                  styles.shareIconContainer,
                  { backgroundColor: "#25D366" },
                ]}
              >
                <MaterialIcons name="chat" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </Pressable>

            <Pressable style={styles.shareOption} onPress={shareToFacebook}>
              <View
                style={[
                  styles.shareIconContainer,
                  { backgroundColor: "#1877F2" },
                ]}
              >
                <MaterialIcons name="facebook" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>Facebook</Text>
            </Pressable>

            <Pressable
              style={styles.shareCancelButton}
              onPress={() => setShareModalVisible(false)}
            >
              <Text style={styles.shareCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  feed: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  welcomeBanner: {
    backgroundColor: "#047857",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#E6F4F1",
  },
  bannerIcon: {
    marginLeft: 12,
  },
  postsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  feedEnd: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  feedEndIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  feedEndLogoImage: {
    width: 60,
    height: 60,
  },
  feedEndText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  feedEndSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  // LinkedIn-style card styles
  linkedInCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  linkedInHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  linkedInHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkedInAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#047857",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  linkedInAuthorInfo: {
    flex: 1,
  },
  linkedInAuthorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  linkedInPostTime: {
    fontSize: 13,
    color: "#6b7280",
  },
  linkedInDeleteButton: {
    padding: 8,
  },
  linkedInCaption: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  linkedInImage: {
    width: "100%",
    height: 220,
    marginBottom: 12,
  },
  linkedInCategoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  linkedInCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  linkedInCategoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkedInImpactContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  linkedInImpactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  linkedInImpactText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
  },
  linkedInActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  linkedInActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkedInActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  linkedInActionTextLiked: {
    color: "#F43F5E",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  navIconContainerActive: {
    backgroundColor: "#E6F4F1",
  },
  navText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: -2,
  },
  navTextActive: {
    color: "#047857",
    fontWeight: "700",
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#047857",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginTop: -8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
  sideMenuContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 1000,
  },
  sideMenu: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 16,
  },
  menuProfileSection: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: "#f0fdf4",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  menuAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#047857",
  },
  menuProfileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  menuProfileLink: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "600",
  },
  menuItems: {
    flex: 1,
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  menuFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  edgeSwipeDetector: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 998,
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  shareModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  shareCancelButton: {
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginTop: 8,
  },
  shareCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
});

export default Homepage;
