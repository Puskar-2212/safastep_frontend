import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { BASE_URL } from "../../constants/config";

const CreatePost = ({ visible, onClose, onPostCreated }) => {
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
      color: "#047857",
      bgColor: "#E6F4F1",
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

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scaleAnims] = useState(categories.map(() => new Animated.Value(1)));

  const pickImage = async () => {
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
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategorySelection(false);
  };

  const handleCategoryPress = (category, index) => {
    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      handleCategorySelect(category);
    });
  };

  const handleCreatePost = async () => {
    if (!newPostImage || !newPostCaption.trim()) {
      Alert.alert(
        "Missing Information",
        "Please add both an image and caption",
      );
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Missing Category", "Please select a category");
      return;
    }

    setUploading(true);

    try {
      const identifier = await AsyncStorage.getItem("mobile"); // This stores both mobile and email

      const formData = new FormData();

      // Check if identifier is email or mobile
      if (identifier.includes("@")) {
        formData.append("email", identifier);
      } else {
        formData.append("mobile", identifier);
      }

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
        Alert.alert(
          "Success!",
          "Your post has been submitted successfully and will be reviewed by our admin team shortly.",
          [{ text: "OK" }],
        );
        resetForm();
        onPostCreated();
        onClose();
      } else {
        // Handle verification failure
        const errorDetail = result.detail || "Failed to create post";

        Alert.alert("Verification Failed", errorDetail, [{ text: "OK" }]);
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
        // Category Selection Screen - Compact List
        <View style={styles.categoryModalContainer}>
          <View style={styles.categoryModalHeader}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#111827" />
            </Pressable>
            <Text style={styles.categoryModalTitle}>Select Category</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.categoryContent}>
            {categories.map((category, index) => (
              <Animated.View
                key={category.id}
                style={{ transform: [{ scale: scaleAnims[index] }] }}
              >
                <Pressable
                  style={styles.categoryListCard}
                  onPress={() => handleCategoryPress(category, index)}
                >
                  <View
                    style={[
                      styles.categoryListIcon,
                      { backgroundColor: category.bgColor },
                    ]}
                  >
                    <MaterialIcons
                      name={category.icon}
                      size={23}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.categoryListText}>
                    <Text style={styles.categoryListName}>{category.name}</Text>
                    <Text style={styles.categoryListDesc}>
                      {category.description}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={19}
                    color="#CBD5E1"
                  />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      ) : (
        // Create Post Screen
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={handleClose}>
                <MaterialIcons name="close" size={26} color="#111827" />
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

            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selectedCategory && (
                <View
                  style={[
                    styles.selectedCategoryBanner,
                    { backgroundColor: selectedCategory.bgColor },
                  ]}
                >
                  <MaterialIcons
                    name={selectedCategory.icon}
                    size={20}
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
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.selectImageButton} onPress={pickImage}>
                  <MaterialIcons
                    name="add-photo-alternate"
                    size={48}
                    color="#047857"
                  />
                  <Text style={styles.selectImageText}>Add Photo</Text>
                </Pressable>
              )}

              <TextInput
                style={styles.captionInput}
                placeholder="Share your eco-action story..."
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
    backgroundColor: "#F8F9FE",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  modalPost: {
    fontSize: 16,
    fontWeight: "800",
    color: "#047857",
  },
  modalPostDisabled: {
    color: "#CBD5E1",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  selectImageButton: {
    height: 220,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  selectImageText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#047857",
    marginTop: 10,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 14,
  },
  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  captionInput: {
    minHeight: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
    marginBottom: 14,
    fontWeight: "500",
  },
  captionTips: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  captionTipsText: {
    flex: 1,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
    fontWeight: "500",
  },
  categoryModalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  categoryModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryModalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  categoryContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 7,
  },
  categoryListCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 11,
    gap: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryListIcon: {
    width: 46,
    height: 46,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryListText: {
    flex: 1,
  },
  categoryListName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  categoryListDesc: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "500",
    lineHeight: 15,
  },
  selectedCategoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  selectedCategoryText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});

export default CreatePost;
