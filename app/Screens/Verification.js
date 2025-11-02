import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import * as Animatable from "react-native-animatable";
import { BASE_URL } from "../config";

const Verification = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Extract user data from params
  const userData = {
    firstName: params.firstName,
    lastName: params.lastName,
    dateOfBirth: {
      year: parseInt(params.year),
      month: parseInt(params.month),
      day: parseInt(params.day),
    },
    pin: params.pin,
  };

  const [mobile, setMobile] = useState(params.mobile || "");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countryCode, setCountryCode] = useState("+977");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const countryCodes = [
    { label: "🇳🇵 +977", value: "+977" },
    { label: "🇺🇸 +1", value: "+1" },
    { label: "🇬🇧 +44", value: "+44" },
    { label: "🇮🇳 +91", value: "+91" },
    { label: "🇨🇳 +86", value: "+86" },
    { label: "🇫🇷 +33", value: "+33" },
  ];

  // Validate phone number
  const validatePhoneNumber = (phone) => {
    if (!phone) {
      Alert.alert("Error", "Please enter a valid mobile number.");
      return false;
    }
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return false;
    }
    return true;
  };

  // Validate OTP
  const validateOtp = (otpValue) => {
    if (otpValue.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP.");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhoneNumber(mobile)) return;

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobile }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsOtpSent(true);
        Alert.alert(
          "OTP Sent",
          "A verification code has been sent to your mobile number."
        );
      } else {
        Alert.alert("Error", data.message || "Failed to send OTP.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Error", "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!validateOtp(otp)) return;

    setOtpLoading(true);

    try {
      // Step 1: Verify OTP
      const verifyResponse = await fetch(`${BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: `${countryCode}${mobile}`,
          otp: otp,
          userData: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: userData.dateOfBirth,
            pin: userData.pin,
          },
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        Alert.alert("Error", verifyData.message || "OTP verification failed.");
        return;
      }

      console.log("OTP verified successfully.");

      // Step 2: Store user data in the database
      const dataToStore = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        dateOfBirth: userData.dateOfBirth,
        pin: userData.pin,
        mobile: `${countryCode}${mobile}`,
      };

      console.log("Data being sent to backend:", dataToStore);

      const signupResponse = await fetch(`${BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToStore),
      });

      const signupResult = await signupResponse.json();

      if (signupResponse.ok) {
        console.log("User data stored successfully.");
        
        Alert.alert(
          "Success",
          "Account created successfully! Please login to continue.",
          [
            {
              text: "OK",
              onPress: () => router.push("/Screens/Login"),
            },
          ]
        );
      } else {
        console.error("Signup failed:", signupResult.detail);

        if (signupResult.detail === "Mobile number already registered.") {
          Alert.alert("Error", "This mobile number is already registered. Please login instead.");
        } else {
          Alert.alert(
            "Error",
            signupResult.detail || "Failed to create account. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error during OTP verification or signup:", error);
      Alert.alert("Error", "Network error occurred. Please check your connection and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleBackToSignup = () => {
    router.push("./SignIn");
  };

  return (
    <ImageBackground
      source={require("../../assets/images/roleImg3.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.overlay}>
          <Animatable.View
            animation="fadeInDown"
            duration={1000}
            style={styles.headerContainer}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="verified-user" size={64} color="#10B981" />
            </View>
            <Text style={styles.headerTitle}>Phone Verification</Text>
            <Text style={styles.headerSubtitle}>
              We need to verify your identity to keep SafaStep secure
            </Text>
          </Animatable.View>

          <Animatable.View
            animation="fadeInUp"
            duration={1000}
            delay={200}
            style={styles.formContainer}
          >
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepLine} />
              <View
                style={[
                  styles.stepDot,
                  isOtpSent && styles.stepDotActive,
                  !isOtpSent && styles.stepDotInactive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    !isOtpSent && styles.stepNumberInactive,
                  ]}
                >
                  2
                </Text>
              </View>
            </View>

            <Text style={styles.stepLabel}>
              {isOtpSent ? "Step 2: Verify Code" : "Step 1: Enter Phone Number"}
            </Text>

            {!isOtpSent ? (
              <>
                <Text style={styles.description}>
                  Enter your phone number to receive a verification code
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCodeContainer}>
                      <RNPickerSelect
                        onValueChange={(value) => setCountryCode(value)}
                        items={countryCodes}
                        value={countryCode}
                        placeholder={{ label: "Code", value: null }}
                        useNativeAndroidPickerStyle={false}
                        style={{
                          inputIOS: styles.countryCodeInput,
                          inputAndroid: styles.countryCodeInput,
                        }}
                      />
                    </View>
                    <TextInput
                      placeholder="Enter phone number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={mobile}
                      onChangeText={(text) => {
                        if (/^\d*$/.test(text) && text.length <= 10)
                          setMobile(text);
                      }}
                      maxLength={10}
                      style={styles.phoneInput}
                      editable={!loading}
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.button, loading && styles.disabledButton]}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Send Verification Code</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.description}>
                  Enter the 6-digit code sent to{" "}
                  <Text style={styles.phoneHighlight}>
                    {countryCode} {mobile}
                  </Text>
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    style={styles.otpInput}
                    editable={!otpLoading}
                    autoFocus
                  />
                </View>

                <Pressable
                  style={[styles.button, otpLoading && styles.disabledButton]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Verify & Create Account</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={styles.resendButton}
                  >
                    <Text style={styles.resendLink}>
                      {loading ? "Sending..." : "Resend"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <Pressable
              onPress={handleBackToSignup}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={20} color="#10B981" />
              <Text style={styles.backText}>Back to Sign Up</Text>
            </Pressable>
          </Animatable.View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default Verification;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#D1D5DB",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#10B981",
  },
  stepDotInactive: {
    backgroundColor: "#E5E7EB",
  },
  stepNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  stepNumberInactive: {
    color: "#9CA3AF",
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  phoneHighlight: {
    fontWeight: "bold",
    color: "#10B981",
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
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countryCodeContainer: {
    width: 100,
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countryCodeInput: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  otpInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: "#6B7280",
  },
  resendButton: {
    padding: 4,
  },
  resendLink: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },
  backText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
  },
});