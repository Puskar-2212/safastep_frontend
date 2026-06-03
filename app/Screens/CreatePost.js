// Screen for selecting an eco-action photo and submitting it for review.
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingOverlay from "../../components/ui/LoadingOverlay";
import RestrictionModal from "../../components/ui/RestrictionModal";
import { BASE_URL } from "../../constants/config";

const CreatePost = ({ visible, onClose, onPostCreated }) => {
  const insets = useSafeAreaInsets();
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  const getStoredIdentifier = async () => {
    // Posts can be created by either email-authenticated or mobile-authenticated users.
    const email = await AsyncStorage.getItem("email");
    const mobile = await AsyncStorage.getItem("mobile");
    return email || mobile;
  };

  const pickImage = async () => {
    try {
      // Open the device gallery and return one selected eco-action image.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        // Store the local file URI so the preview and upload can reuse the same asset.
        setNewPostImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleCreatePost = async () => {
    if (!newPostImage) {
      Alert.alert("Missing Image", "Please add a photo to create a post.");
      return;
    }

    setUploading(true);

    try {
      const identifier = await getStoredIdentifier();

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      // Multipart form data is required because the request mixes text fields and an image file.
      const formData = new FormData();
      if (identifier?.includes("@")) {
        formData.append("email", identifier);
      } else {
        formData.append("mobile", identifier);
      }

      formData.append("caption", newPostCaption.trim());
      // The backend expects the uploaded image under the "image" field name.
      formData.append("image", {
        uri: newPostImage,
        type: "image/jpeg",
        name: `post_${Date.now()}.jpg`,
      });

      // This endpoint starts the full backend flow: validation, verification, Cloudinary upload, and MongoDB save.
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
          "Your post has been submitted and is now waiting for admin review.",
          [{ text: "OK" }],
        );
        // Reset local state so the next post starts with a clean composer.
        resetForm();
        onPostCreated();
        onClose();
      } else {
        if (response.status === 403) {
          setRestrictionMessage(
            result.detail || "Your account is banned from creating posts.",
          );
          setShowRestrictionModal(true);
        } else {
          Alert.alert(
            "Upload Failed",
            result.detail || "Failed to create post.",
            [{ text: "OK" }],
          );
        }
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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.screenOverlay}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalHeader,
              { paddingTop: Math.max(insets.top + 10, 50) },
            ]}
          >
            <Pressable onPress={handleClose}>
              <MaterialIcons name="close" size={26} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>Share Eco-Action</Text>
            <Pressable
              onPress={handleCreatePost}
              disabled={uploading || !newPostImage}
            >
              <Text
                style={[
                  styles.modalPost,
                  !newPostImage && styles.modalPostDisabled,
                ]}
              >
                {uploading ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom + 20, 20),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.helperBanner}>
              <MaterialIcons name="fact-check" size={18} color="#065F46" />
              <Text style={styles.helperBannerText}>
                Add a clear photo. Captions are optional and every post is reviewed by our admin team.
              </Text>
            </View>

            {newPostImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: newPostImage }}
                  style={styles.imagePreview}
                  resizeMode="contain"
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
                <Text style={styles.selectImageSubtext}>
                  Upload a photo of your eco-friendly action
                </Text>
              </Pressable>
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption if you want..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={newPostCaption}
              onChangeText={setNewPostCaption}
              maxLength={500}
            />
          </ScrollView>

          <RestrictionModal
            visible={showRestrictionModal}
            title="Posting Disabled"
            message={restrictionMessage}
            icon="edit-off"
            onClose={() => setShowRestrictionModal(false)}
          />

          <LoadingOverlay
            visible={uploading}
            title="Posting"
            message="Uploading your photo. This may take a moment."
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F9FE",
    zIndex: 999,
    elevation: 999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  helperBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: 14,
  },
  helperBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
    fontWeight: "500",
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
    paddingHorizontal: 16,
  },
  selectImageText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#047857",
    marginTop: 10,
  },
  selectImageSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
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
});

export default CreatePost;
