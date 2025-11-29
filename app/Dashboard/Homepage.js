import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../config";

const Homepage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const categories = [
    {
      id: 'transportation',
      name: 'Transportation',
      icon: 'directions-bus',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      description: 'Eco-friendly commute & travel'
    },
    {
      id: 'plantation',
      name: 'Plantation',
      icon: 'park',
      color: '#10B981',
      bgColor: '#D1FAE5',
      description: 'Tree planting & gardening'
    },
    {
      id: 'recycling',
      name: 'Recycling',
      icon: 'recycling',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      description: 'Reuse & recycle materials'
    },
    {
      id: 'waste-management',
      name: 'Waste Management',
      icon: 'delete-outline',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      description: 'Proper waste disposal'
    },
    {
      id: 'energy',
      name: 'Energy Conservation',
      icon: 'bolt',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      description: 'Save energy & resources'
    },
  ];

  useEffect(() => {
    loadUserData();
    loadPosts();
  }, []);

  const loadUserData = async () => {
    try {
      const mobile = params.mobile || (await AsyncStorage.getItem("mobile"));

      if (!mobile) {
        router.push("/Screens/Login");
        return;
      }

      const response = await fetch(`${BASE_URL}/user/${mobile}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setUserData(result.user);
        await AsyncStorage.setItem("mobile", mobile);
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
      
      // Fetch posts from backend
      const response = await fetch(`${BASE_URL}/posts`);
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
              co2: "0 kg" // You can calculate this based on category
            },
            likes: post.likesCount,
            comments: post.commentsCount,
            timeAgo: timeAgo,
            liked: post.likes.includes(mobile),
            categoryId: post.categoryId,
            mobile: post.mobile
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
      const mobile = await AsyncStorage.getItem("mobile");
      
      const formData = new FormData();
      formData.append('mobile', mobile);

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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewPostImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategorySelection(false);
    setShowCreatePost(true);
  };

  const handleCreatePost = async () => {
    if (!newPostImage || !newPostCaption.trim()) {
      Alert.alert('Missing Information', 'Please add both an image and caption');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Missing Category', 'Please select a category');
      return;
    }

    setUploading(true);

    try {
      const mobile = await AsyncStorage.getItem("mobile");
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('mobile', mobile);
      formData.append('caption', newPostCaption);
      formData.append('category', selectedCategory.name);
      formData.append('categoryId', selectedCategory.id);
      
      // Add image file
      const imageFile = {
        uri: newPostImage,
        type: 'image/jpeg',
        name: `post_${Date.now()}.jpg`,
      };
      formData.append('image', imageFile);

      // Call backend API
      const response = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Reload posts to show the new one
        await loadPosts();
        
        setShowCreatePost(false);
        setNewPostImage(null);
        setNewPostCaption('');
        setSelectedCategory(null);
        Alert.alert('Success', 'Your eco-action has been shared!');
      } else {
        Alert.alert('Error', result.detail || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafaStep</Text>
        <View style={styles.headerIcons}>
          <Pressable style={styles.headerIcon}>
            <MaterialIcons name="notifications-none" size={26} color="#111827" />
          </Pressable>
        </View>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Welcome, {userData?.firstName}! 👋
            </Text>
            <Text style={styles.bannerSubtitle}>
              Discover eco-actions from your community
            </Text>
          </View>
          <View style={styles.bannerIcon}>
            <MaterialIcons name="eco" size={40} color="#10B981" />
          </View>
        </View>

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
                <MaterialIcons name="eco" size={16} color="#10B981" />
                <Text style={styles.categoryText}>{post.impact.category}</Text>
              </View>

              {/* Image with Overlay */}
              <View style={styles.imageContainer}>
                <Image source={post.image} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.imageOverlay}>
                  <View style={styles.userBadge}>
                    <View style={styles.smallAvatar}>
                      <MaterialIcons name="person" size={16} color="#fff" />
                    </View>
                    <Text style={styles.overlayUserName}>{post.user.name}</Text>
                  </View>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{post.caption}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {post.description}
                </Text>

                {/* Impact Stats */}
                <View style={styles.impactContainer}>
                  <View style={styles.impactBadge}>
                    <MaterialIcons name="cloud" size={18} color="#10B981" />
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
                      <MaterialIcons name="delete-outline" size={18} color="#10B981" />
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
                      color={post.liked ? "#EF4444" : "#6B7280"} 
                    />
                    <Text style={[styles.actionText, post.liked && styles.actionTextLiked]}>
                      {post.likes}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.cardActionButton}>
                    <MaterialIcons name="chat-bubble-outline" size={20} color="#6B7280" />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </Pressable>

                  <Pressable style={styles.cardActionButton}>
                    <MaterialIcons name="share" size={20} color="#6B7280" />
                  </Pressable>

                  <View style={styles.timeContainer}>
                    <MaterialIcons name="access-time" size={14} color="#9CA3AF" />
                    <Text style={styles.timeText}>{post.timeAgo}</Text>
                  </View>
                </View>
              </View>
            </Animatable.View>
          ))}
        </View>

        <View style={styles.feedEnd}>
          <View style={styles.feedEndIcon}>
            <MaterialIcons name="eco" size={48} color="#10B981" />
          </View>
          <Text style={styles.feedEndText}>You're all caught up!</Text>
          <Text style={styles.feedEndSubtext}>
            Check back later for more inspiring eco-actions
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable 
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <MaterialIcons 
            name="home" 
            size={28} 
            color={activeTab === 'home' ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          onPress={() => setActiveTab('explore')}
        >
          <MaterialIcons 
            name="campaign" 
            size={28} 
            color={activeTab === 'explore' ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.navText, activeTab === 'explore' && styles.navTextActive]}>
            Explore
          </Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          onPress={() => setShowCategorySelection(true)}
        >
          <View style={styles.addButton}>
            <MaterialIcons name="add" size={28} color="#fff" />
          </View>
          <Text style={styles.navText}>Post</Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          onPress={() => setActiveTab('calculator')}
        >
          <MaterialIcons 
            name="eco" 
            size={28} 
            color={activeTab === 'calculator' ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.navText, activeTab === 'calculator' && styles.navTextActive]}>
            CO₂ Calc
          </Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
        >
          <MaterialIcons 
            name="person-outline" 
            size={28} 
            color={activeTab === 'profile' ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategorySelection}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.categoryModalContainer}>
          {/* Simple Header */}
          <View style={styles.categoryModalHeader}>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowCategorySelection(false)}
            >
              <MaterialIcons name="close" size={24} color="#111827" />
            </Pressable>
            <Text style={styles.categoryModalTitle}>Select Category</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.categoryScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            <View style={styles.categoriesGrid}>
              {categories.map((category, index) => (
                <Animatable.View
                  key={category.id}
                  animation="fadeInUp"
                  duration={400}
                  delay={index * 80}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.categoryCard,
                      pressed && styles.categoryCardPressed
                    ]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <View style={styles.categoryCardInner}>
                      <View style={[styles.categoryIconContainer, { backgroundColor: category.bgColor }]}>
                        <MaterialIcons name={category.icon} size={40} color={category.color} />
                      </View>
                      <View style={styles.categoryTextContainer}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryDescription}>{category.description}</Text>
                      </View>
                      <View style={[styles.categoryArrowCircle, { backgroundColor: category.bgColor }]}>
                        <MaterialIcons name="arrow-forward-ios" size={18} color={category.color} />
                      </View>
                    </View>
                  </Pressable>
                </Animatable.View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePost}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => {
              setShowCreatePost(false);
              setNewPostImage(null);
              setNewPostCaption('');
            }}>
              <MaterialIcons name="close" size={28} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>Share Eco-Action</Text>
            <Pressable 
              onPress={handleCreatePost}
              disabled={uploading || !newPostImage || !newPostCaption.trim()}
            >
              <Text style={[
                styles.modalPost,
                (!newPostImage || !newPostCaption.trim()) && styles.modalPostDisabled
              ]}>
                {uploading ? 'Posting...' : 'Post'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCategory && (
              <View style={[styles.selectedCategoryBanner, { backgroundColor: selectedCategory.bgColor }]}>
                <MaterialIcons name={selectedCategory.icon} size={24} color={selectedCategory.color} />
                <Text style={[styles.selectedCategoryText, { color: selectedCategory.color }]}>
                  {selectedCategory.name}
                </Text>
              </View>
            )}

            {newPostImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: newPostImage }} style={styles.imagePreview} />
                <Pressable 
                  style={styles.removeImageButton}
                  onPress={() => setNewPostImage(null)}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.selectImageButton} onPress={pickImage}>
                <MaterialIcons name="add-photo-alternate" size={64} color="#10B981" />
                <Text style={styles.selectImageText}>Add Photo</Text>
              </Pressable>
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Share your eco-action story... 🌱"
              placeholderTextColor="#9CA3AF"
              multiline
              value={newPostCaption}
              onChangeText={setNewPostCaption}
              maxLength={500}
            />

            <View style={styles.captionTips}>
              <MaterialIcons name="info-outline" size={20} color="#6B7280" />
              <Text style={styles.captionTipsText}>
                Share what eco-friendly action you took and inspire others!
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  feed: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  welcomeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#D1FAE5",
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#059669",
  },
  bannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  postsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  ecoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 240,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
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
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayUserName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
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
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  impactText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
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
    color: "#6B7280",
  },
  actionTextLiked: {
    color: "#EF4444",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
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
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  feedEndText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  feedEndSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
  },
  navText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#10B981",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalPost: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  modalPostDisabled: {
    color: "#9CA3AF",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  selectImageButton: {
    height: 300,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  selectImageText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 12,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 20,
  },
  imagePreview: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  captionInput: {
    minHeight: 120,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  captionTips: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
  },
  captionTipsText: {
    flex: 1,
    fontSize: 14,
    color: "#065F46",
    lineHeight: 20,
  },
  categoryModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  categoryModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  categoryScrollView: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  categoryScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  categoryCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  categoryIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 19,
  },
  categoryArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCategoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedCategoryText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

export default Homepage;
