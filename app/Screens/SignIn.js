import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { signUpWithEmail } from '../../utils/firebaseAuth';
import { BASE_URL } from '../../constants/config';

const signInWithGoogle = async () => {
  Alert.alert('Not Available', 'Google Sign-In not available in Expo Go');
  return { success: false };
};

const SignUp = () => {
  const [signupMethod, setSignupMethod] = useState('mobile'); // 'mobile' or 'email'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);
  const [day, setDay] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isYearModalVisible, setIsYearModalVisible] = useState(false);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Generate years (1900 to current year)
  const years = Array.from(
    { length: new Date().getFullYear() - 1899 },
    (_, i) => 1900 + i
  ).reverse();

  // Months
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Days (1-31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleEmailSignup = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    // Stronger password validation
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // Check for password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Weak Password', 
        'Password must contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!year || !month || !day) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    setLoading(true);

    // Create Firebase account
    const result = await signUpWithEmail(email, password);

    if (result.success) {
      // Save user data to backend immediately (even before email verification)
      try {
        const backendResponse = await fetch(`${BASE_URL}/signup-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            dateOfBirth: {
              year: parseInt(year),
              month: parseInt(month),
              day: parseInt(day),
            },
            email,
            firebaseUid: result.user.uid,
          }),
        });

        const backendResult = await backendResponse.json();
        
        if (!backendResponse.ok && !backendResult.detail?.includes('already registered')) {
          console.error('Failed to save to backend:', backendResult);
        }
      } catch (error) {
        console.error('Error saving to backend:', error);
      }

      // Check if email is verified
      if (!result.user.emailVerified) {
        Alert.alert(
          'Verify Your Email', 
          'We sent a verification link to your email. Please verify your email before continuing.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/Screens/Login');
              },
            },
          ]
        );
      } else {
        // Email is verified, proceed to profile setup for profile picture
        router.push({
          pathname: './ProfileSetup',
          params: {
            firstName,
            lastName,
            email,
            uid: result.user.uid,
            year,
            month,
            day,
          },
        });
      }
    } else {
      Alert.alert('Error', result.error);
    }

    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);

    const result = await signInWithGoogle();

    if (result.success) {
      // TODO: Send user data to your backend
      Alert.alert('Success', 'Signed in with Google!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to home or profile setup
            router.push({
              pathname: './ProfileSetup',
              params: {
                email: result.user.email,
                displayName: result.user.displayName,
                uid: result.user.uid,
              },
            });
          },
        },
      ]);
    } else {
      Alert.alert('Error', result.error);
    }

    setLoading(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!year || !month || !day) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    if (!pin || pin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    // Prepare user data
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: { year, month, day },
      pin,
    };

    // Navigate to Verification screen
    router.push({
      pathname: './Verification',
      params: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        year: userData.dateOfBirth.year,
        month: userData.dateOfBirth.month,
        day: userData.dateOfBirth.day,
        pin: userData.pin,
      },
    });
  };

  const renderYearItem = ({ item }) => (
    <Pressable
      style={[styles.gridButton, year === item && styles.selectedGridButton]}
      onPress={() => {
        setYear(item);
        setIsYearModalVisible(false);
      }}
    >
      <Text style={[styles.gridButtonText, year === item && styles.selectedText]}>
        {item}
      </Text>
    </Pressable>
  );

  const renderMonthItem = ({ item, index }) => (
    <Pressable
      style={[styles.gridButton, month === index + 1 && styles.selectedGridButton]}
      onPress={() => {
        setMonth(index + 1);
        setIsMonthModalVisible(false);
      }}
    >
      <Text style={[styles.gridButtonText, month === index + 1 && styles.selectedText]}>
        {item}
      </Text>
    </Pressable>
  );

  const renderDayItem = ({ item }) => (
    <Pressable
      style={[styles.gridButton, day === item && styles.selectedGridButton]}
      onPress={() => {
        setDay(item);
        setIsDayModalVisible(false);
      }}
    >
      <Text style={[styles.gridButtonText, day === item && styles.selectedText]}>
        {item}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require('../../assets/images/roleImg3.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.overlay}>
          <View style={styles.formContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="eco" size={40} color="#047857" />
              </View>
              <Text style={styles.title}>Join SafaStep</Text>
              <Text style={styles.subtitle}>Every step reduces carbon</Text>
            </View>

            {/* Signup Method Toggle */}
            <View style={styles.methodToggle}>
              <Pressable
                style={[styles.methodButton, signupMethod === 'mobile' && styles.methodButtonActive]}
                onPress={() => setSignupMethod('mobile')}
              >
                <MaterialIcons 
                  name="phone" 
                  size={20} 
                  color={signupMethod === 'mobile' ? '#fff' : '#6B7280'} 
                />
                <Text style={[styles.methodButtonText, signupMethod === 'mobile' && styles.methodButtonTextActive]}>
                  Mobile
                </Text>
              </Pressable>
              <Pressable
                style={[styles.methodButton, signupMethod === 'email' && styles.methodButtonActive]}
                onPress={() => setSignupMethod('email')}
              >
                <MaterialIcons 
                  name="email" 
                  size={20} 
                  color={signupMethod === 'email' ? '#fff' : '#6B7280'} 
                />
                <Text style={[styles.methodButtonText, signupMethod === 'email' && styles.methodButtonTextActive]}>
                  Email
                </Text>
              </Pressable>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              {signupMethod === 'email' ? (
                <>
                  {/* Email Signup Fields */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      placeholder="Enter your first name"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={setFirstName}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      placeholder="Enter your last name"
                      placeholderTextColor="#9CA3AF"
                      value={lastName}
                      onChangeText={setLastName}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Enter password (min 6 characters)"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isPasswordVisible}
                        value={password}
                        onChangeText={setPassword}
                        style={styles.pinInput}
                      />
                      <Pressable
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.eyeIcon}
                      >
                        <MaterialIcons
                          name={isPasswordVisible ? 'visibility' : 'visibility-off'}
                          size={22}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.pinContainer}>
                      <TextInput
                        placeholder="Re-enter your password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!isConfirmPasswordVisible}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.pinInput}
                      />
                      <Pressable
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                        style={styles.eyeIcon}
                      >
                        <MaterialIcons
                          name={isConfirmPasswordVisible ? 'visibility' : 'visibility-off'}
                          size={22}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Date of Birth */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <View style={styles.dateContainer}>
                      <Pressable
                        style={styles.datePickerButton}
                        onPress={() => setIsDayModalVisible(true)}
                      >
                        <Text style={[styles.datePickerText, !day && styles.placeholder]}>
                          {day || 'Day'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                      </Pressable>

                      <Pressable
                        style={[styles.datePickerButton, styles.monthPicker]}
                        onPress={() => setIsMonthModalVisible(true)}
                      >
                        <Text style={[styles.datePickerText, !month && styles.placeholder]}>
                          {month ? months[month - 1].substring(0, 3) : 'Month'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                      </Pressable>

                      <Pressable
                        style={styles.datePickerButton}
                        onPress={() => setIsYearModalVisible(true)}
                      >
                        <Text style={[styles.datePickerText, !year && styles.placeholder]}>
                          {year || 'Year'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Submit Button */}
                  <Pressable 
                    style={[styles.button, loading && styles.buttonDisabled]} 
                    onPress={handleEmailSignup}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Create Account</Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </Pressable>

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Google Sign-In Button */}
                  <Pressable 
                    style={styles.googleButton} 
                    onPress={handleGoogleSignup}
                    disabled={loading}
                  >
                    <MaterialIcons name="g-translate" size={24} color="#4285F4" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Mobile Signup Fields (Original) */}
              {/* Name Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  placeholder="Enter your first name"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  placeholder="Enter your last name"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <View style={styles.dateContainer}>
                  {/* Day */}
                  <Pressable
                    style={styles.datePickerButton}
                    onPress={() => setIsDayModalVisible(true)}
                  >
                    <Text style={[styles.datePickerText, !day && styles.placeholder]}>
                      {day || 'Day'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                  </Pressable>

                  {/* Month */}
                  <Pressable
                    style={[styles.datePickerButton, styles.monthPicker]}
                    onPress={() => setIsMonthModalVisible(true)}
                  >
                    <Text style={[styles.datePickerText, !month && styles.placeholder]}>
                      {month ? months[month - 1].substring(0, 3) : 'Month'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                  </Pressable>

                  {/* Year */}
                  <Pressable
                    style={styles.datePickerButton}
                    onPress={() => setIsYearModalVisible(true)}
                  >
                    <Text style={[styles.datePickerText, !year && styles.placeholder]}>
                      {year || 'Year'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                  </Pressable>
                </View>
              </View>

              {/* PIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Create PIN (4 digits)</Text>
                <View style={styles.pinContainer}>
                  <TextInput
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!isPinVisible}
                    keyboardType="numeric"
                    maxLength={4}
                    value={pin}
                    onChangeText={(text) => {
                      if (/^\d*$/.test(text)) {
                        setPin(text);
                      }
                    }}
                    style={styles.pinInput}
                  />
                  <Pressable
                    onPress={() => setIsPinVisible(!isPinVisible)}
                    style={styles.eyeIcon}
                  >
                    <MaterialIcons
                      name={isPinVisible ? 'visibility' : 'visibility-off'}
                      size={22}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm PIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm PIN</Text>
                <View style={styles.pinContainer}>
                  <TextInput
                    placeholder="Re-enter your PIN"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!isConfirmPinVisible}
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={(text) => {
                      if (/^\d*$/.test(text)) {
                        setConfirmPin(text);
                      }
                    }}
                    style={styles.pinInput}
                  />
                  <Pressable
                    onPress={() => setIsConfirmPinVisible(!isConfirmPinVisible)}
                    style={styles.eyeIcon}
                  >
                    <MaterialIcons
                      name={isConfirmPinVisible ? 'visibility' : 'visibility-off'}
                      size={22}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Create Account</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
                </>
              )}

              {/* Login Link */}
              <Link href="./Login" asChild>
                <Pressable style={styles.loginLink}>
                  <Text style={styles.loginText}>
                    Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      {/* Year Modal */}
      <Modal
        visible={isYearModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsYearModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <Pressable onPress={() => setIsYearModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </Pressable>
            </View>
            <FlatList
              data={years}
              renderItem={renderYearItem}
              keyExtractor={(item) => item.toString()}
              numColumns={3}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Month Modal */}
      <Modal
        visible={isMonthModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMonthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <Pressable onPress={() => setIsMonthModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </Pressable>
            </View>
            <FlatList
              data={months}
              renderItem={renderMonthItem}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Day Modal */}
      <Modal
        visible={isDayModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Day</Text>
              <Pressable onPress={() => setIsDayModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </Pressable>
            </View>
            <FlatList
              data={days}
              renderItem={renderDayItem}
              keyExtractor={(item) => item.toString()}
              numColumns={7}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  scrollContent: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '500',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    height: 52,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthPicker: {
    flex: 1.3,
  },
  datePickerText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  placeholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  pinContainer: {
    position: 'relative',
  },
  pinInput: {
    height: 52,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    letterSpacing: 4,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 15,
    padding: 4,
  },
  button: {
    backgroundColor: '#047857',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginTextBold: {
    color: '#047857',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  grid: {
    paddingBottom: 20,
  },
  gridButton: {
    minWidth: 90,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 4,
  },
  selectedGridButton: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  gridButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#047857',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodButtonTextActive: {
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default SignUp;


