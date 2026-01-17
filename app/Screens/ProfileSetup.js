import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
import { BASE_URL } from '../../constants/config';

const ProfileSetup = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isEmailUser = params.email && params.uid; // Check if this is an email signup

  // Request permissions on mount
  React.useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus} = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera and photo library permissions to set your profile picture.');
        }
      }
    })();
  }, []);

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImageFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadProfilePicture = async () => {
    if (!profileImage) {
      Alert.alert('No Image', 'Please select a profile picture first');
      return;
    }

    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      
      // Get file extension
      const uriParts = profileImage.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const identifier = isEmailUser ? params.email : params.mobile;

      formData.append('file', {
        uri: profileImage,
        name: `profile_${identifier}_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      });

      formData.append(isEmailUser ? 'email' : 'mobile', identifier);

      // Upload to backend
      const response = await fetch(`${BASE_URL}/upload-profile-picture`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await AsyncStorage.setItem("mobile", identifier);
        Alert.alert('Success', 'Profile picture uploaded successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/Dashboard/Homepage',
                params: { mobile: identifier },
              });
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const skipForNow = () => {
    const identifier = isEmailUser ? params.email : params.mobile;
    
    Alert.alert(
      'Skip Profile Picture?',
      'You can add a profile picture later from your profile settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip & Continue',
          onPress: async () => {
            await AsyncStorage.setItem("mobile", identifier);
            router.push({
              pathname: '/Dashboard/Homepage',
              params: { mobile: identifier },
            });
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.content}>
        <Animatable.View animation="fadeInDown" duration={1000} style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="person-add" size={48} color="#10B981" />
          </View>
          <Text style={styles.title}>Set Your Profile Picture</Text>
          <Text style={styles.subtitle}>
            Let others recognize you in the SafaStep community
          </Text>
        </Animatable.View>

        <Animatable.View animation="zoomIn" duration={1000} delay={300} style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons name="person" size={80} color="#9CA3AF" />
            </View>
          )}
          
          <Pressable style={styles.cameraButton} onPress={showImageOptions}>
            <MaterialIcons name="camera-alt" size={24} color="#fff" />
          </Pressable>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={500} style={styles.buttonContainer}>
          <Pressable
            style={[styles.selectButton, !profileImage && styles.selectButtonPrimary]}
            onPress={showImageOptions}
          >
            <MaterialIcons name="add-photo-alternate" size={24} color={profileImage ? "#10B981" : "#fff"} />
            <Text style={[styles.selectButtonText, !profileImage && styles.selectButtonTextPrimary]}>
              {profileImage ? 'Change Picture' : 'Select Picture'}
            </Text>
          </Pressable>

          {profileImage && (
            <Pressable
              style={[styles.uploadButton, uploading && styles.disabledButton]}
              onPress={uploadProfilePicture}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="cloud-upload" size={24} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload & Continue</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable style={styles.skipButton} onPress={skipForNow}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        </Animatable.View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Your profile picture helps build trust in the community
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Your image is stored securely and never shared without permission
            </Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#10B981',
  },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 10,
    right: '50%',
    marginRight: -90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContainer: {
    gap: 16,
  },
  selectButton: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#fff',
  },
  selectButtonPrimary: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  selectButtonTextPrimary: {
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 32,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default ProfileSetup;
