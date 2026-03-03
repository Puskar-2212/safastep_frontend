import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
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
import * as Animatable from "react-native-animatable";
import RNPickerSelect from "react-native-picker-select";
import { BASE_URL } from "../../constants/config";
import { resetPassword, signInWithEmail } from "../../utils/firebaseAuth";

// Splash Screen Component
const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => onFinish(), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.splashContainer}>
      <View style={styles.splashIconContainer}>
        <MaterialIcons name="eco" size={80} color="#047857" />
      </View>
      <Text style={styles.splashTitle}>SafaStep</Text>
      <Text style={styles.splashSubtitle}>Every step reduces carbon</Text>
      <ActivityIndicator size="large" color="#047857" style={styles.loader} />
    </View>
  );
};

// Login Page Component
const LoginPage = () => {
  const [loginMethod, setLoginMethod] = useState("mobile"); // 'mobile' or 'email'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+977");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [message, setMessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isNewPinVisible, setIsNewPinVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const backgroundImages = [
    require("../../assets/images/roleImg3.jpg"),
    require("../../assets/images/roleImg4.jpeg"),
    require("../../assets/images/roleImg5.jpeg"),
    require("../../assets/images/roleImg7.jpeg"),
  ];

  const motivationalMessages = [
    "🌱 Every step towards a greener planet counts",
    "🌍 Small actions, massive impact on carbon reduction",
    "♻️ Your journey to sustainability starts here",
    "🌿 Walk the path to a cleaner tomorrow",
    "🌳 Together we can reduce our carbon footprint",
    "💚 Making eco-friendly choices easier every day",
    "🌎 Join the movement for a sustainable future",
    "🍃 Track your impact, celebrate your progress",
    "🌸 Every conscious step creates positive change",
    "✨ Building a carbon-neutral world, one step at a time",
  ];

  const countryCodes = [
    { label: "🇳🇵 +977", value: "+977" },
    { label: "🇺🇸 +1", value: "+1" },
    { label: "🇬🇧 +44", value: "+44" },
    { label: "🇮🇳 +91", value: "+91" },
    { label: "🇨🇳 +86", value: "+86" },
    { label: "🇫🇷 +33", value: "+33" },
  ];

  const router = useRouter();

  useEffect(() => {
    const randomImageIndex = Math.floor(
      Math.random() * backgroundImages.length,
    );
    const randomMessageIndex = Math.floor(
      Math.random() * motivationalMessages.length,
    );
    setBackgroundImage(backgroundImages[randomImageIndex]);
    setMessage(motivationalMessages[randomMessageIndex]);
  }, []);

  const handleLogin = async () => {
    if (!phoneNumber || !pin) {
      Alert.alert("Error", "Please fill all the fields.");
      return;
    }
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return;
    }
    if (pin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }

    setLoading(true);
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: fullPhoneNumber,
          pin: pin,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        await AsyncStorage.setItem("mobile", fullPhoneNumber);

        // Initialize push notifications
        pushNotificationService.initialize(fullPhoneNumber).catch((err) => {
          console.log("Push notification setup failed:", err);
        });

        setTimeout(() => {
          setSuccess(false);
          router.push({
            pathname: "/Dashboard/Homepage",
            params: { mobile: fullPhoneNumber },
          });
        }, 2000);
      } else {
        Alert.alert(
          "Error",
          result.detail || "Login failed. Please check your credentials.",
        );
      }
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert(
        "Error",
        "Failed to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email, password);

    if (result.success) {
      if (!result.user.emailVerified) {
        setLoading(false);
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in. Check your inbox for the verification link.",
          [{ text: "OK" }],
        );
        return;
      }

      // Email verified, check if user has profile picture
      try {
        const response = await fetch(
          `${BASE_URL}/user/by-identifier/${result.user.email}`,
        );
        const userData = await response.json();

        setLoading(false);

        if (response.ok && userData.success) {
          // Check if user has profile picture
          if (!userData.user.profilePicture) {
            // No profile picture, go to ProfileSetup
            router.push({
              pathname: "/Screens/ProfileSetup",
              params: {
                email: result.user.email,
                uid: result.user.uid,
              },
            });
          } else {
            // Has profile picture, proceed to homepage
            setSuccess(true);
            await AsyncStorage.setItem("mobile", result.user.email);

            setTimeout(() => {
              router.push({
                pathname: "/Dashboard/Homepage",
                params: { mobile: result.user.email },
              });
            }, 1500);
          }
        } else {
          // User doesn't exist in backend (shouldn't happen), go to homepage anyway
          setSuccess(true);
          await AsyncStorage.setItem("mobile", result.user.email);

          setTimeout(() => {
            router.push({
              pathname: "/Dashboard/Homepage",
              params: { mobile: result.user.email },
            });
          }, 1500);
        }
      } catch (error) {
        setLoading(false);
        console.error("Error checking user:", error);
        Alert.alert("Error", "Failed to connect to server");
      }
    } else {
      setLoading(false);
      Alert.alert("Login Failed", result.error);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    // First, check if user exists in database
    try {
      const checkResponse = await fetch(
        `${BASE_URL}/user/by-identifier/${resetEmail}`,
      );

      if (!checkResponse.ok) {
        setLoading(false);
        Alert.alert(
          "Error",
          "This email is not registered. Please sign up first.",
        );
        return;
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to verify email. Please try again.");
      return;
    }

    // User exists, send reset email
    const result = await resetPassword(resetEmail);
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", result.message, [
        {
          text: "OK",
          onPress: () => {
            setForgotPasswordModalVisible(false);
            setResetEmail("");
          },
        },
      ]);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const handleForgotPin = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/forgot-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobile: phoneNumber }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "OTP sent to your phone number.");
        setOtpSent(true);
      } else {
        Alert.alert("Error", result.detail || "Failed to send OTP.");
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !newPin) {
      Alert.alert("Error", "Please enter OTP and new PIN.");
      return;
    }
    if (newPin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/verify-otp-pin-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: fullPhoneNumber,
          otp: otp,
          new_pin: newPin,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "PIN reset successfully.");
        setModalVisible(false);
        setOtpSent(false);
        setOtp("");
        setNewPin("");
        setPin(newPin);
      } else {
        Alert.alert(
          "Error",
          result.detail || "Invalid OTP or failed to reset PIN.",
        );
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.overlay}>
            <Animatable.View
              animation="fadeInDown"
              duration={1000}
              style={styles.headerContainer}
            >
              <View style={styles.logoContainer}>
                <MaterialIcons name="eco" size={48} color="#047857" />
              </View>
              <Text style={styles.motivationalText}>{message}</Text>
            </Animatable.View>

            <Animatable.View
              animation="fadeInUp"
              duration={1000}
              delay={200}
              style={styles.formContainer}
            >
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your journey
              </Text>

              {/* Login Method Toggle */}
              <View style={styles.methodToggle}>
                <Pressable
                  style={[
                    styles.methodButton,
                    loginMethod === "mobile" && styles.methodButtonActive,
                  ]}
                  onPress={() => setLoginMethod("mobile")}
                >
                  <MaterialIcons
                    name="phone"
                    size={20}
                    color={loginMethod === "mobile" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      loginMethod === "mobile" && styles.methodButtonTextActive,
                    ]}
                  >
                    Mobile
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.methodButton,
                    loginMethod === "email" && styles.methodButtonActive,
                  ]}
                  onPress={() => setLoginMethod("email")}
                >
                  <MaterialIcons
                    name="email"
                    size={20}
                    color={loginMethod === "email" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      loginMethod === "email" && styles.methodButtonTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </Pressable>
              </View>

              {loginMethod === "email" ? (
                <>
                  {/* Email Login Fields */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        style={styles.pinInput}
                        placeholder="Enter your password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isPasswordVisible}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <Pressable
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.eyeIcon}
                      >
                        <MaterialIcons
                          name={
                            isPasswordVisible ? "visibility" : "visibility-off"
                          }
                          size={22}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Forgot Password Link */}
                  <Pressable
                    onPress={() => {
                      setResetEmail(email);
                      setForgotPasswordModalVisible(true);
                    }}
                    style={styles.forgotPinContainer}
                  >
                    <Text style={styles.forgotPinText}>Forgot Password?</Text>
                  </Pressable>

                  {/* Email Login Button */}
                  <Pressable
                    style={[
                      styles.loginButton,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleEmailLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color="#fff"
                        />
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Mobile Login Fields (Original) */}
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
                        style={styles.phoneNumberInput}
                        placeholder="Enter phone number"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={(text) => {
                          if (/^\d*$/.test(text) && text.length <= 10)
                            setPhoneNumber(text);
                        }}
                        maxLength={10}
                      />
                    </View>
                  </View>

                  {/* PIN */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>PIN</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        style={styles.pinInput}
                        placeholder="Enter your 4-digit PIN"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isPinVisible}
                        keyboardType="numeric"
                        maxLength={4}
                        value={pin}
                        onChangeText={(text) => {
                          if (/^\d*$/.test(text)) setPin(text);
                        }}
                      />
                      <Pressable
                        onPress={() => setIsPinVisible(!isPinVisible)}
                        style={styles.eyeIcon}
                      >
                        <MaterialIcons
                          name={isPinVisible ? "visibility" : "visibility-off"}
                          size={22}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Forgot PIN */}
                  <Pressable
                    onPress={() => setModalVisible(true)}
                    style={styles.forgotPinContainer}
                  >
                    <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                  </Pressable>

                  {/* Login Button */}
                  <Pressable
                    style={[styles.button, loading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Sign In</Text>
                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color="#fff"
                        />
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* Register Link */}
              <Pressable
                style={styles.registerLink}
                onPress={() => router.push("/Screens/SignIn")}
              >
                <Text style={styles.registerText}>
                  Don't have an account?{" "}
                  <Text style={styles.registerTextBold}>Sign Up</Text>
                </Text>
              </Pressable>
            </Animatable.View>
          </View>
        </ScrollView>

        {/* Success Modal */}
        <Modal visible={success} animationType="fade" transparent={true}>
          <View style={styles.successModalOverlay}>
            <Animatable.View
              animation="zoomIn"
              duration={500}
              style={styles.successModalContent}
            >
              <View style={styles.successIconContainer}>
                <MaterialIcons name="check-circle" size={80} color="#047857" />
              </View>
              <Text style={styles.successText}>Login Successful!</Text>
              <Text style={styles.successSubtext}>
                Welcome back to SafaStep
              </Text>
            </Animatable.View>
          </View>
        </Modal>

        {/* Forgot PIN Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {otpSent ? "Verify OTP" : "Reset PIN"}
                </Text>
                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setOtpSent(false);
                    setOtp("");
                    setNewPin("");
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {!otpSent ? (
                  <>
                    <Text style={styles.modalDescription}>
                      Enter your phone number to receive a verification code
                    </Text>

                    <View style={styles.modalInputGroup}>
                      <Text style={styles.modalLabel}>Phone Number</Text>
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
                          style={styles.phoneNumberInput}
                          placeholder="Enter phone number"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={(text) => {
                            if (/^\d*$/.test(text) && text.length <= 10)
                              setPhoneNumber(text);
                          }}
                          maxLength={10}
                        />
                      </View>
                    </View>

                    <Pressable
                      style={[styles.button, loading && styles.disabledButton]}
                      onPress={handleForgotPin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalDescription}>
                      Enter the verification code sent to your phone
                    </Text>

                    <View style={styles.modalInputGroup}>
                      <Text style={styles.modalLabel}>OTP Code</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={otp}
                        onChangeText={setOtp}
                        maxLength={6}
                      />
                    </View>

                    <View style={styles.modalInputGroup}>
                      <Text style={styles.modalLabel}>New PIN</Text>
                      <View style={styles.pinContainer}>
                        <TextInput
                          style={styles.pinInput}
                          placeholder="Enter 4-digit PIN"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry={!isNewPinVisible}
                          value={newPin}
                          onChangeText={(text) => {
                            if (/^\d*$/.test(text)) setNewPin(text);
                          }}
                        />
                        <Pressable
                          onPress={() => setIsNewPinVisible(!isNewPinVisible)}
                          style={styles.eyeIcon}
                        >
                          <MaterialIcons
                            name={
                              isNewPinVisible ? "visibility" : "visibility-off"
                            }
                            size={22}
                            color="#6B7280"
                          />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      style={[styles.button, loading && styles.disabledButton]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>
                          Verify & Reset PIN
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Forgot Password Modal */}
        <Modal
          visible={forgotPasswordModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Pressable
                  onPress={() => {
                    setForgotPasswordModalVisible(false);
                    setResetEmail("");
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalDescription}>
                  Enter your email address and we'll send you a link to reset
                  your password
                </Text>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Email Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                  />
                </View>

                <Pressable
                  style={[styles.button, loading && styles.disabledButton]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

// Main App Component
const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  if (!showLogin) return <SplashScreen onFinish={() => setShowLogin(true)} />;
  return <LoginPage />;
};

export default App;

// Styles
const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  splashIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 16,
    color: "#047857",
    fontWeight: "500",
    marginBottom: 32,
  },
  loader: {
    marginTop: 20,
  },

  // Login Screen Styles
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingVertical: 40,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(236, 253, 245, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  motivationalText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 32,
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
    gap: 8,
  },
  countryCodeContainer: {
    width: "28%",
  },
  countryCodeInput: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    height: 52,
  },
  phoneNumberInput: {
    flex: 1,
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    top: 15,
    padding: 4,
  },
  forgotPinContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  forgotPinText: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#047857",
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  registerLink: {
    alignItems: "center",
    paddingVertical: 16,
  },
  registerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  registerTextBold: {
    color: "#047857",
    fontWeight: "700",
  },

  // Method Toggle Styles
  methodToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: "#047857",
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  methodButtonTextActive: {
    color: "#FFFFFF",
  },

  // Email Login Styles
  input: {
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loginButton: {
    backgroundColor: "#047857",
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 300,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 15,
    color: "#047857",
    fontWeight: "500",
  },

  // Forgot PIN Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  modalDescription: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    letterSpacing: 2,
  },
});


