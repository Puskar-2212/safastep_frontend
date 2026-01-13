import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/config";

const CreatePost = ({ visible, onClose, onPostCreated }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const categories = [
    {
      id: "transportation",
      name: "Transportation",
      icon: "directions-bus",
      color: "#3B82F6",
      bgColor: "#DBEAFE",
      description: "Eco-friendly commute & travel",
    },
    {
      id: "plantation",
      name: "Plantation",
      icon: "park",
      color: "#10B981",
      bgColor: "#D1FAE5",
      description: "Tree planting & gardening",
    },
    {
      id: "recycling",
      name: "Recycling",
      icon: "recycling",
      color: "#8B5CF6",
      bgColor: "#EDE9FE",
      description: "Reuse & recycle materials",
    },
    {
      id: "waste-management",
      name: "Waste Management",
      icon: "delete-outline",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      description: "Proper waste disposal",
    },
    {
      id: "energy",
      name: "Energy Conservation",
      icon: "bolt",
      color: "#EF4444",
      bgColor: "#FEE2E2",
      description: "Save energy & resources",
    },
  ];

  const pickImage = async () => {
    // Show guidance before opening camera
    Alert.alert(
      "Photo Guidelines",
      "📸 For verification:\n• Include YOUR FACE clearly\n• Show the eco-action (recycling, plants, etc.)\n• Take a clear, well-lit photo\n\nThis prevents fraud and earns you Eco Points!",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.canceled) {
                setNewPostImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error("Error picking image:", error);
              Alert.alert("Error", "Failed to pick image");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategorySelection(false);
  };

  const handleCreatePost = async () => {
    if (!newPostImage || !newPostCaption.trim()) {
      Alert.alert("Missing Information", "Please add both an image and caption");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Missing Category", "Please select a category");
      return;
    }

    setUploading(true);

    try {
      const mobile = await AsyncStorage.getItem("mobile");

      const formData = new FormData();
      formData.append("mobile", mobile);
      formData.append("caption", newPostCaption);
      formData.append("category", selectedCategory.name);
      formData.append("categoryId", selectedCategory.id);

      const imageFile = {
        uri: newPostImage,
        type: "image/jpeg",
        name: `post_${Date.now()}.jpg`,
      };
      formData.append("image", imageFile);

      const response = await fetch(`${BASE_URL}/posts`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const rewards = result.rewards || {};
        const ecoPoints = rewards.ecoPoints || 0;
        const co2Offset = rewards.co2Offset || 0;
        
        Alert.alert(
          "Success! ✓", 
          `Your eco-action has been verified and shared!\n\n🎉 Rewards Earned:\n• ${ecoPoints} Eco Points\n• ${co2Offset} kg CO₂ Offset\n\nVerification Score: ${result.post?.verificationScore || 'N/A'}/100`,
          [{ text: "OK" }]
        );
        resetForm();
        onPostCreated();
        onClose();
      } else {
        // Handle verification failure
        const errorDetail = result.detail || "Failed to create post";
        
        Alert.alert(
          "Verification Failed",
          errorDetail,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setNewPostImage(null);
    setNewPostCaption("");
    setSelectedCategory(null);
    setShowCategorySelection(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      {showCategorySelection ? (
        // Category Selection Screen
        <View style={styles.categoryModalContainer}>
          <View style={styles.categoryModalHeader}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
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
                <Pressable
                  key={category.id}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    pressed && styles.categoryCardPressed,
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <View style={styles.categoryCardInner}>
                    <View
                      style={[
                        styles.categoryIconContainer,
                        { backgroundColor: category.bgColor },
                      ]}
                    >
                      <MaterialIcons
                        name={category.icon}
                        size={40}
                        color={category.color}
                      />
                    </View>
                    <View style={styles.categoryTextContainer}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.categoryArrowCircle,
                        { backgroundColor: category.bgColor },
                      ]}
                    >
                      <MaterialIcons
                        name="arrow-forward-ios"
                        size={18}
                        color={category.color}
                      />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        // Create Post Screen
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleClose}>
              <MaterialIcons name="close" size={28} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>Share Eco-Action</Text>
            <Pressable
              onPress={handleCreatePost}
              disabled={uploading || !newPostImage || !newPostCaption.trim()}
            >
              <Text
                style={[
                  styles.modalPost,
                  (!newPostImage || !newPostCaption.trim()) &&
                    styles.modalPostDisabled,
                ]}
              >
                {uploading ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {selectedCategory && (
              <View
                style={[
                  styles.selectedCategoryBanner,
                  { backgroundColor: selectedCategory.bgColor },
                ]}
              >
                <MaterialIcons
                  name={selectedCategory.icon}
                  size={24}
                  color={selectedCategory.color}
                />
                <Text
                  style={[
                    styles.selectedCategoryText,
                    { color: selectedCategory.color },
                  ]}
                >
                  {selectedCategory.name}
                </Text>
              </View>
            )}

            {newPostImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: newPostImage }}
                  style={styles.imagePreview}
                />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setNewPostImage(null)}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.selectImageButton} onPress={pickImage}>
                <MaterialIcons
                  name="add-photo-alternate"
                  size={64}
                  color="#10B981"
                />
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
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  modalPost: {
    fontSize: 17,
    fontWeight: "800",
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
    height: 320,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#D1FAE5",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  selectImageText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#10B981",
    marginTop: 14,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 20,
  },
  imagePreview: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  removeImageButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  captionInput: {
    minHeight: 130,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: "#111827",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
    marginBottom: 18,
    fontWeight: "500",
  },
  captionTips: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  captionTipsText: {
    flex: 1,
    fontSize: 14,
    color: "#065F46",
    lineHeight: 21,
    fontWeight: "500",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
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
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  categoryCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  categoryCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
    gap: 18,
  },
  categoryIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    fontWeight: "500",
  },
  categoryArrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCategoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCategoryText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});

export default CreatePost;
