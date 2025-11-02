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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);
  const [day, setDay] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState(false);
  const [isYearModalVisible, setIsYearModalVisible] = useState(false);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);

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

  
  return (
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
      >
        <View style={styles.overlay}>
          <View style={styles.formContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="eco" size={40} color="#10B981" />
              </View>
              <Text style={styles.title}>Join SafaStep</Text>
              <Text style={styles.subtitle}>Every step reduces carbon</Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
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
    color: '#10B981',
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
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#10B981',
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
    color: '#10B981',
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
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
});

export default SignUp;