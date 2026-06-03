// Privacy and security settings screen for password/PIN and account deletion controls.
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/config";
import { changePassword } from "../../utils/firebaseAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PrivacySecurity = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userIdentifier, setUserIdentifier] = useState(null);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [changePinModalVisible, setChangePinModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCurrentPinVisible, setIsCurrentPinVisible] = useState(false);
  const [isNewPinVisible, setIsNewPinVisible] = useState(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState(false);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is email or mobile user
  React.useEffect(() => {
    const checkUserType = async () => {
      // Email users are stored under "email" and mobile users under "mobile",
      // so this screen must check both before deciding which security action to show.
      const email = await AsyncStorage.getItem("email");
      const mobile = await AsyncStorage.getItem("mobile");
      const identifier = email || mobile;
      setUserIdentifier(identifier);
      setIsEmailUser(Boolean(email));
    };
    checkUserType();
  }, []);

  const handleChangePin = async () => {
    // Validation
    if (!currentPin || !newPin || !confirmPin) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert("Error", "PIN must be 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("Error", "New PIN and Confirm PIN do not match");
      return;
    }

    if (currentPin === newPin) {
      Alert.alert("Error", "New PIN must be different from current PIN");
      return;
    }

    setLoading(true);

    try {
      const mobile = await AsyncStorage.getItem("mobile");

      const response = await fetch(`${BASE_URL}/change-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          currentPin,
          newPin,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert("Success", "PIN changed successfully!", [
          {
            text: "OK",
            onPress: () => {
              setChangePinModalVisible(false);
              setCurrentPin("");
              setNewPin("");
              setConfirmPin("");
            },
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to change PIN");
      }
    } catch (error) {
      console.error("Error changing PIN:", error);
      Alert.alert("Error", "Failed to change PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    // Check for password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Weak Password', 
        'Password must contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setLoading(true);

    const result = await changePassword(
      currentPassword,
      newPassword,
      isEmailUser ? userIdentifier : null,
    );
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", result.message, [
        {
          text: "OK",
          onPress: () => {
            setChangePasswordModalVisible(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          },
        },
      ]);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.\n\n• All your posts will be deleted\n• Your carbon footprint data will be removed\n• You will be logged out immediately",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");

      const response = await fetch(`${BASE_URL}/delete-account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.clear();
        Alert.alert("Account Deleted", "Your account has been permanently deleted.", [
          {
            text: "OK",
            onPress: () => router.push("/Screens/Login"),
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top + 10, 50) },
          ]}
        >
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
        >
          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.card}>
              {isEmailUser ? (
                <Pressable
                  style={styles.item}
                  onPress={() => setChangePasswordModalVisible(true)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: "#E8F7F0" }]}>
                      <MaterialIcons name="lock" size={22} color="#0C8A4B" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemLabel}>Change Password</Text>
                      <Text style={styles.itemDescription}>
                        Update your login password
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.item}
                  onPress={() => setChangePinModalVisible(true)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: "#E8F7F0" }]}>
                      <MaterialIcons name="lock" size={22} color="#0C8A4B" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemLabel}>Change PIN</Text>
                      <Text style={styles.itemDescription}>
                        Update your 4-digit login PIN
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <View style={styles.dangerCard}>
              <Pressable style={styles.item} onPress={handleDeleteAccount}>
                <View style={styles.itemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: "#FEE2E2" }]}>
                    <MaterialIcons name="delete-forever" size={22} color="#EF4444" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemLabel, { color: "#EF4444" }]}>
                      Delete Account
                    </Text>
                    <Text style={styles.itemDescription}>
                      Permanently delete your account and data
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Change PIN Modal */}
        <Modal
          visible={changePinModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setChangePinModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change PIN</Text>
                  <Pressable onPress={() => setChangePinModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Current PIN */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current PIN</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Enter current PIN"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={!isCurrentPinVisible}
                        value={currentPin}
                        onChangeText={setCurrentPin}
                        style={styles.pinInput}
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsCurrentPinVisible(!isCurrentPinVisible)}
                      >
                        <MaterialIcons
                          name={isCurrentPinVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* New PIN */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New PIN</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Enter new PIN"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={!isNewPinVisible}
                        value={newPin}
                        onChangeText={setNewPin}
                        style={styles.pinInput}
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsNewPinVisible(!isNewPinVisible)}
                      >
                        <MaterialIcons
                          name={isNewPinVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Confirm PIN */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New PIN</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Confirm new PIN"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={!isConfirmPinVisible}
                        value={confirmPin}
                        onChangeText={setConfirmPin}
                        style={styles.pinInput}
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsConfirmPinVisible(!isConfirmPinVisible)}
                      >
                        <MaterialIcons
                          name={isConfirmPinVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color="#047857" />
                    <Text style={styles.infoText}>
                      Your PIN must be 4 digits and different from your current PIN
                    </Text>
                  </View>

                  {/* Buttons */}
                  <Pressable
                    style={[styles.button, loading && styles.disabledButton]}
                    onPress={handleChangePin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Change PIN</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setChangePinModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={changePasswordModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setChangePasswordModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change Password</Text>
                  <Pressable onPress={() => setChangePasswordModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Current Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Enter current password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isCurrentPasswordVisible}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        style={styles.pinInput}
                        autoCapitalize="none"
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsCurrentPasswordVisible(!isCurrentPasswordVisible)}
                      >
                        <MaterialIcons
                          name={isCurrentPasswordVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Enter new password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isNewPasswordVisible}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        style={styles.pinInput}
                        autoCapitalize="none"
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                      >
                        <MaterialIcons
                          name={isNewPasswordVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Re-enter new password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isConfirmPasswordVisible}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.pinInput}
                        autoCapitalize="none"
                      />
                      <Pressable
                        style={styles.eyeIcon}
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                      >
                        <MaterialIcons
                          name={isConfirmPasswordVisible ? "visibility" : "visibility-off"}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color="#047857" />
                    <Text style={styles.infoText}>
                      Password must be at least 8 characters with uppercase, lowercase, and number
                    </Text>
                  </View>

                  {/* Buttons */}
                  <Pressable
                    style={[styles.button, loading && styles.disabledButton]}
                    onPress={handleChangePassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Change Password</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setChangePasswordModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#0C8A4B",
    shadowColor: "#0C8A4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0C8A4B",
    marginBottom: 14,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  dangerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FEE2E2",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  pinContainer: {
    position: "relative",
  },
  pinInput: {
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    letterSpacing: 4,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 16,
    padding: 4,
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#E6F4F1",
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#0C8A4B",
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0C8A4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },
});

export default PrivacySecurity;


