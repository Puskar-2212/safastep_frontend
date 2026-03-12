import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { BASE_URL } from "../config";

export default function ChallengeDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [note, setNote] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadChallengeDetail();
  }, []);

  const loadChallengeDetail = async () => {
    try {
      const identifier = await AsyncStorage.getItem("mobile");

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        router.back();
        return;
      }

      if (!params.id) {
        Alert.alert("Error", "Invalid challenge ID");
        router.back();
        return;
      }

      const response = await fetch(
        `${BASE_URL}/challenges/my-challenges?user_id=${identifier}`,
      );
      const data = await response.json();

      if (data.success) {
        const foundChallenge = data.challenges.find((c) => c._id === params.id);
        if (foundChallenge) {
          setChallenge(foundChallenge);
        } else {
          Alert.alert("Error", "Challenge not found");
          router.back();
        }
      } else {
        Alert.alert("Error", "Failed to load challenge");
        router.back();
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      Alert.alert("Error", "Failed to load challenge. Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!canCheckInToday()) {
      Alert.alert(
        "Info",
        "You've already checked in today or it's not time yet!",
      );
      return;
    }

    setCheckingIn(true);
    try {
      const identifier = await AsyncStorage.getItem("mobile");

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        setCheckingIn(false);
        return;
      }

      const formData = new FormData();
      formData.append("user_id", identifier);
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const response = await fetch(
        `${BASE_URL}/challenges/${challenge._id}/checkin`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success! 🎉", data.message);
        setNote("");
        await loadChallengeDetail();
      } else {
        Alert.alert("Info", data.message);
      }
    } catch (error) {
      console.error("Error checking in:", error);
      Alert.alert("Error", "Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleClaimReward = async () => {
    setClaiming(true);
    try {
      const identifier = await AsyncStorage.getItem("mobile");

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        setClaiming(false);
        return;
      }

      const formData = new FormData();
      formData.append("user_id", identifier);

      const response = await fetch(
        `${BASE_URL}/challenges/${challenge._id}/claim-reward`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Reward Claimed! 🎉", data.message, [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Info", data.message);
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      Alert.alert("Error", "Failed to claim reward. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const canCheckInToday = () => {
    if (!challenge) return false;

    const today = new Date().toISOString().split("T")[0];
    const todayCheckIn = challenge.check_ins.find((c) => c.date === today);

    return todayCheckIn && !todayCheckIn.checked_in;
  };

  const getDayName = (dateString) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const date = new Date(dateString + "T00:00:00");
    return days[date.getDay()];
  };

  const getFormattedDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00");
    return date.getDate();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={styles.loadingText}>Loading challenge...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Challenge not found</Text>
      </View>
    );
  }

  const progressPercentage = challenge
    ? Math.min(
        100,
        ((challenge.current_streak || 0) / challenge.target_days) * 100,
      )
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Challenge Info */}
        <View style={styles.infoCard}>
          <Text style={styles.challengeTitle}>{challenge.challenge_title}</Text>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              Day {challenge.current_streak || 0} of {challenge.target_days}
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}% Complete
            </Text>
          </View>
        </View>

        {/* Calendar View */}
        <View style={styles.calendarCard}>
          <Text style={styles.sectionTitle}>Daily Progress</Text>
          <View style={styles.calendar}>
            {challenge.check_ins.map((checkIn, index) => {
              const checkInDate = new Date(checkIn.date + "T00:00:00");
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const isPast = checkInDate < today;
              const isToday = checkInDate.getTime() === today.getTime();
              const isFuture = checkInDate > today;

              return (
                <View key={index} style={styles.dayBox}>
                  <Text style={styles.dayName}>{getDayName(checkIn.date)}</Text>
                  <View
                    style={[
                      styles.dayCircle,
                      checkIn.checked_in && styles.dayCircleChecked,
                      isToday && !checkIn.checked_in && styles.dayCircleToday,
                      isPast && !checkIn.checked_in && styles.dayCircleMissed,
                      isFuture && styles.dayCircleFuture,
                    ]}
                  >
                    {checkIn.checked_in ? (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.dayNumber,
                          isToday && styles.dayNumberToday,
                          isPast &&
                            !checkIn.checked_in &&
                            styles.dayNumberMissed,
                        ]}
                      >
                        {getFormattedDate(checkIn.date)}
                      </Text>
                    )}
                  </View>
                  {checkIn.checked_in && checkIn.note && (
                    <MaterialIcons
                      name="note"
                      size={12}
                      color="#047857"
                      style={styles.noteIcon}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Failed Challenge Message */}
        {challenge.status === "failed" && (
          <View style={styles.failedCard}>
            <MaterialIcons name="error" size={48} color="#EF4444" />
            <Text style={styles.failedText}>Challenge Failed</Text>
            <Text style={styles.failedSubtext}>
              {challenge.failure_reason ||
                "You missed too many days to continue this challenge."}
            </Text>
            <Text style={styles.failedNote}>
              Don't worry! You can always start a new challenge.
            </Text>
          </View>
        )}

        {/* Check-in Section */}
        {!challenge.completed &&
          challenge.status === "in_progress" &&
          canCheckInToday() && (
            <View style={styles.checkInCard}>
              <Text style={styles.sectionTitle}>Check In for Today</Text>
              <Text style={styles.checkInSubtitle}>
                Did you complete today's challenge?
              </Text>

              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional)"
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />

              <Pressable
                style={[
                  styles.checkInButton,
                  checkingIn && styles.buttonDisabled,
                ]}
                onPress={handleCheckIn}
                disabled={checkingIn}
              >
                {checkingIn ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={24} color="#fff" />
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

        {/* Completed - Claim Reward */}
        {challenge.completed &&
          !challenge.reward_claimed &&
          challenge.status !== "claimed" && (
            <View style={styles.rewardCard}>
              <MaterialIcons name="celebration" size={48} color="#F59E0B" />
              <Text style={styles.congratsText}>Congratulations! 🎉</Text>
              <Text style={styles.congratsSubtext}>
                You've completed the challenge!
              </Text>

              <View style={styles.rewardBadge}>
                <MaterialIcons name="stars" size={32} color="#F59E0B" />
                <Text style={styles.rewardPoints}>
                  {challenge.reward_points} Eco Points
                </Text>
              </View>

              <Pressable
                style={[styles.claimButton, claiming && styles.buttonDisabled]}
                onPress={handleClaimReward}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="redeem" size={24} color="#fff" />
                    <Text style={styles.claimButtonText}>Claim Reward</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

        {/* Already Claimed */}
        {(challenge.reward_claimed || challenge.status === "claimed") && (
          <View style={styles.claimedCard}>
            <MaterialIcons name="check-circle" size={48} color="#047857" />
            <Text style={styles.claimedText}>Reward Claimed!</Text>
            <Text style={styles.claimedSubtext}>
              You earned {challenge.reward_points} Eco Points
            </Text>
          </View>
        )}

        {/* Check-in History */}
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Check-in History</Text>
          {challenge.check_ins
            .filter((c) => c.checked_in)
            .reverse()
            .map((checkIn, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color="#047857"
                  />
                  <View style={styles.historyText}>
                    <Text style={styles.historyDate}>
                      Day {checkIn.day} - {getDayName(checkIn.date)}
                    </Text>
                    {checkIn.note && (
                      <Text style={styles.historyNote}>{checkIn.note}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

          {challenge.check_ins.filter((c) => c.checked_in).length === 0 && (
            <Text style={styles.emptyHistory}>No check-ins yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  progressSection: {
    gap: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#047857",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "right",
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dayBox: {
    alignItems: "center",
    width: "12%",
  },
  dayName: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 6,
    fontWeight: "600",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  dayCircleChecked: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  dayCircleToday: {
    borderColor: "#047857",
    borderWidth: 2,
  },
  dayCircleMissed: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  dayCircleFuture: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  dayNumberToday: {
    color: "#047857",
  },
  dayNumberMissed: {
    color: "#EF4444",
  },
  noteIcon: {
    marginTop: 4,
  },
  checkInCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  checkInSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    minHeight: 70,
    textAlignVertical: "top",
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#047857",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  checkInButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  rewardCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
  },
  congratsSubtext: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 24,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  rewardPoints: {
    fontSize: 20,
    fontWeight: "700",
    color: "#92400E",
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  claimedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  claimedText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#047857",
    marginTop: 12,
  },
  claimedSubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
  },
  claimedNote: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
    fontStyle: "italic",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  historyText: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  historyNote: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  emptyHistory: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 20,
  },
  failedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  failedText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 12,
  },
  failedSubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },
  failedNote: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
    fontStyle: "italic",
    textAlign: "center",
  },
});
