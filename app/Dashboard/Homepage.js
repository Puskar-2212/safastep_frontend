import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Animatable from "react-native-animatable";
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
  const [activeTab, setActiveTab] = useState('home');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  useEffect(() => {
    loadUserData();
    loadPosts();
    checkIfFirstTime();
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
      const response = await fetch(`${BASE_URL}/user/by-identifier/${identifier}`);
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
        const transformedPosts = result.posts.map(post => {
          // Calculate time ago
          const timeAgo = getTimeAgo(post.createdAt);
          
          return {
            id: post._id,
            user: { 
              name: post.userName, 
              avatar: post.userProfilePicture 
            },
            image: { uri: post.imageUrl },
            caption: post.caption,
            description: post.caption,
            impact: { 
              category: post.category,
              co2: post.co2Offset ? `${post.co2Offset} kg` : "0 kg",
              ecoPoints: post.ecoPoints || 0
            },
            likes: post.likesCount,
            comments: post.commentsCount,
            timeAgo: timeAgo,
            liked: post.liked, // Now comes from backend
            categoryId: post.categoryId,
            mobile: post.mobile,
            email: post.email,
            identifier: post.identifier
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

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadPosts();
  };

  const handleLike = async (postId) => {
    try {
      const identifier = await AsyncStorage.getItem("mobile");
      
      const formData = new FormData();
      
      // Check if identifier is email or mobile
      if (identifier.includes('@')) {
        formData.append('email', identifier);
      } else {
        formData.append('mobile', identifier);
      }

      const response = await fetch(`${BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, liked: result.liked, likes: result.likesCount }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleDeletePost = (postId, postOwner) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
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
              const paramName = identifier.includes('@') ? 'email' : 'mobile';

              const response = await fetch(`${BASE_URL}/posts/${postId}?${paramName}=${identifier}`, {
                method: "DELETE",
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert("Success", "Post deleted successfully!");
                // Remove post from local state
                setPosts(posts.filter(post => post.id !== postId));
              } else {
                Alert.alert("Error", result.detail || "Failed to delete post");
              }
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post");
            }
          },
        },
      ]
    );
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === 'profile') {
      return <Profile userData={userData} onRefresh={loadUserData} />;
    }

    if (activeTab === 'calculator') {
      return <CO2CalculatorLanding />;
    }

    if (activeTab === 'explore') {
      return <ExploreMap />;
    }

    // Default Home Feed
    return (
      <ScrollView
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
                  : `Welcome back, ${userData.firstName}! 👋`
                }
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
          {posts.map((post, index) => (
            <Animatable.View
              key={post.id}
              animation="fadeInUp"
              duration={600}
              delay={index * 100}
              style={styles.ecoCard}
            >
              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <MaterialIcons name="eco" size={16} color="#fff" />
                <Text style={styles.categoryText}>{post.impact.category}</Text>
              </View>

              {/* Image with Overlay */}
              <View style={styles.imageContainer}>
                <Image source={post.image} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.imageOverlay}>
                  <Pressable
                    style={styles.userBadge}
                    onPress={() => {
                      const currentUserIdentifier = userData?.mobile || userData?.email;
                      const postOwnerIdentifier = post.identifier || post.mobile || post.email;
                      
                      if (currentUserIdentifier !== postOwnerIdentifier) {
                        // Navigate to other user's profile
                        router.push(`/Screens/UserProfile?mobile=${encodeURIComponent(postOwnerIdentifier)}`);
                      }
                    }}
                  >
                    <View style={styles.smallAvatar}>
                      <MaterialIcons name="person" size={16} color="#fff" />
                    </View>
                    <Text style={styles.overlayUserName}>
                      {(() => {
                        // Get current user's identifier
                        const currentUserIdentifier = userData?.mobile || userData?.email;
                        // Get post owner's identifier
                        const postOwnerIdentifier = post.identifier || post.mobile || post.email;
                        // Check if current user is the post owner
                        const isOwnPost = currentUserIdentifier === postOwnerIdentifier;
                        
                        return isOwnPost ? post.user.name : "Anonymous User";
                      })()}
                    </Text>
                    {(() => {
                      const currentUserIdentifier = userData?.mobile || userData?.email;
                      const postOwnerIdentifier = post.identifier || post.mobile || post.email;
                      return currentUserIdentifier !== postOwnerIdentifier;
                    })() && (
                      <MaterialIcons name="chevron-right" size={16} color="#fff" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Delete button - only show for user's own posts */}
              {(() => {
                const currentUserIdentifier = userData?.mobile || userData?.email;
                const postOwnerIdentifier = post.identifier || post.mobile || post.email;
                return currentUserIdentifier === postOwnerIdentifier;
              })() && (
                <Pressable
                  style={styles.deletePostButton}
                  onPress={() => handleDeletePost(post.id, post.identifier || post.mobile || post.email)}
                >
                  <MaterialIcons name="delete" size={20} color="#fff" />
                </Pressable>
              )}

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{post.caption}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {post.description}
                </Text>

                {/* Impact Stats */}
                <View style={styles.impactContainer}>
                  <View style={styles.impactBadge}>
                    <MaterialIcons name="cloud" size={18} color="#6366F1" />
                    <Text style={styles.impactText}>{post.impact.co2} CO₂</Text>
                  </View>
                  {post.impact.trees && (
                    <View style={styles.impactBadge}>
                      <MaterialIcons name="park" size={18} color="#10B981" />
                      <Text style={styles.impactText}>{post.impact.trees} trees</Text>
                    </View>
                  )}
                  {post.impact.waste && (
                    <View style={styles.impactBadge}>
                      <MaterialIcons name="delete-outline" size={18} color="#F59E0B" />
                      <Text style={styles.impactText}>{post.impact.waste}</Text>
                    </View>
                  )}
                </View>

                {/* Actions Row */}
                <View style={styles.cardActions}>
                  <Pressable 
                    style={styles.cardActionButton}
                    onPress={() => handleLike(post.id)}
                  >
                    <MaterialIcons 
                      name={post.liked ? "favorite" : "favorite-border"} 
                      size={22} 
                      color={post.liked ? "#F43F5E" : "#64748B"} 
                    />
                    <Text style={[styles.actionText, post.liked && styles.actionTextLiked]}>
                      {post.likes}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.cardActionButton}>
                    <MaterialIcons name="chat-bubble-outline" size={20} color="#64748B" />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </Pressable>

                  <Pressable style={styles.cardActionButton}>
                    <MaterialIcons name="share" size={20} color="#64748B" />
                  </Pressable>

                  <View style={styles.timeContainer}>
                    <MaterialIcons name="access-time" size={14} color="#94A3B8" />
                    <Text style={styles.timeText}>{post.timeAgo}</Text>
                  </View>
                </View>
              </View>
            </Animatable.View>
          ))}
        </View>

        <View style={styles.feedEnd}>
          <View style={styles.feedEndIcon}>
            <MaterialIcons name="eco" size={48} color="#6366F1" />
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
      {activeTab === 'home' && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SafaStep</Text>
          <View style={styles.headerIcons}>
            <Pressable style={styles.headerIcon}>
              <MaterialIcons name="notifications-none" size={26} color="#111827" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Content - Don't wrap calculator in extra view */}
      {activeTab === 'calculator' ? (
        <CO2CalculatorLanding />
      ) : (
        renderContent()
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable 
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <View style={[styles.navIconContainer, activeTab === 'home' && styles.navIconContainerActive]}>
            <MaterialIcons 
              name="home" 
              size={26} 
              color={activeTab === 'home' ? "#6366F1" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </Pressable>

        <Pressable 
          style={[styles.navItem, activeTab === 'explore' && styles.navItemActive]}
          onPress={() => setActiveTab('explore')}
        >
          <View style={[styles.navIconContainer, activeTab === 'explore' && styles.navIconContainerActive]}>
            <MaterialIcons 
              name="campaign" 
              size={26} 
              color={activeTab === 'explore' ? "#6366F1" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.navText, activeTab === 'explore' && styles.navTextActive]}>
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
          style={[styles.navItem, activeTab === 'calculator' && styles.navItemActive]}
          onPress={() => setActiveTab('calculator')}
        >
          <View style={[styles.navIconContainer, activeTab === 'calculator' && styles.navIconContainerActive]}>
            <MaterialIcons 
              name="eco" 
              size={26} 
              color={activeTab === 'calculator' ? "#6366F1" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.navText, activeTab === 'calculator' && styles.navTextActive]}>
            CO₂ Calc
          </Text>
        </Pressable>

        <Pressable 
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <View style={[styles.navIconContainer, activeTab === 'profile' && styles.navIconContainerActive]}>
            <MaterialIcons 
              name={activeTab === 'profile' ? "person" : "person-outline"} 
              size={26} 
              color={activeTab === 'profile' ? "#6366F1" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Create Post Component */}
      <CreatePost
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={loadPosts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFBFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#6366F1",
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  feed: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  welcomeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#6366F1",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  bannerSubtitle: {
    fontSize: 15,
    color: "#E0E7FF",
    fontWeight: "500",
  },
  bannerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  postsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  ecoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    zIndex: 10,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  deletePostButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 280,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayUserName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 18,
  },
  impactContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  impactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
  },
  impactText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardActionButton: {
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
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  timeText: {
    fontSize: 12,
    color: "#94A3B8",
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
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  navItemActive: {
    transform: [{ scale: 1.05 }],
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
    backgroundColor: "#EEF2FF",
  },
  navText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: -2,
  },
  navTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginTop: -8,
  },
});

export default Homepage;
