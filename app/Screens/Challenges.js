import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BASE_URL } from "../config";

export default function Challenges() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState("available"); // available, my-challenges, or history

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const identifier = await AsyncStorage.getItem("mobile");

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Load available challenges
      const availableResponse = await fetch(
        `${BASE_URL}/challenges/daily-checkin`,
      );
      const availableData = await availableResponse.json();

      if (availableData.success) {
        setAvailableChallenges(availableData.challenges || []);
      }

      // Load user's challenges
      const myResponse = await fetch(
        `${BASE_URL}/challenges/my-challenges?user_id=${identifier}`,
      );
      const myData = await myResponse.json();

      if (myData.success) {
        setMyChallenges(myData.challenges || []);
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
      Alert.alert("Error", "Failed to load challenges. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      const identifier = await AsyncStorage.getItem("mobile");

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const formData = new FormData();
      formData.append("user_id", identifier);

      const response = await fetch(
        `${BASE_URL}/challenges/${challengeId}/accept`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success! 🎉", data.message, [
          {
            text: "OK",
            onPress: () => {
              loadChallenges();
              setActiveTab("my-challenges"); // Switch to My Challenges tab
            },
          },
        ]);
      } else {
        Alert.alert("Info", data.message);
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
      Alert.alert("Error", "Failed to accept challenge. Please try again.");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChallenges();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "#047857";
      case "medium":
        return "#F59E0B";
      case "hard":
        return "#EF4444";
      default:
        return "#047857";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "waste_management":
        return "delete-outline";
      case "transportation":
        return "directions-bus";
      case "food":
        return "restaurant";
      case "energy":
        return "bolt";
      default:
        return "eco";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "available" && styles.activeTab]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "available" && styles.activeTabText,
            ]}
          >
            Available
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "my-challenges" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("my-challenges")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "my-challenges" && styles.activeTabText,
            ]}
          >
            Active (
            {myChallenges.filter((c) => c.status === "in_progress").length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History ({myChallenges.filter((c) => c.status === "claimed").length}
            )
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "available" ? (
          // Available Challenges
          <View style={styles.challengesList}>
            {availableChallenges.map((challenge) => (
              <View key={challenge.challenge_id} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                  <View style={styles.challengeHeaderText}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <View style={styles.challengeMeta}>
                      <View
                        style={[
                          styles.difficultyBadge,
                          {
                            backgroundColor:
                              getDifficultyColor(challenge.difficulty) + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyText,
                            {
                              color: getDifficultyColor(challenge.difficulty),
                            },
                          ]}
                        >
                          {challenge.difficulty}
                        </Text>
                      </View>
                      <Text style={styles.durationText}>
                        {challenge.duration_days} days
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.challengeDescription}>
                  {challenge.description}
                </Text>

                <View style={styles.rewardContainer}>
                  <MaterialIcons name="stars" size={20} color="#F59E0B" />
                  <Text style={styles.rewardText}>
                    {challenge.reward_points} Eco Points
                  </Text>
                </View>

                <Pressable
                  style={styles.acceptButton}
                  onPress={() => handleAcceptChallenge(challenge.challenge_id)}
                >
                  <Text style={styles.acceptButtonText}>Accept Challenge</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : activeTab === "my-challenges" ? (
          // My Active Challenges
          <View style={styles.challengesList}>
            {myChallenges.filter((c) => c.status === "in_progress").length ===
            0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="emoji-events" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>No active challenges</Text>
                <Text style={styles.emptyStateSubtext}>
                  Accept a challenge to get started!
                </Text>
              </View>
            ) : (
              myChallenges
                .filter((c) => c.status === "in_progress")
                .map((challenge) => {
                  const challengeIcon =
                    challenge.challenge_icon ||
                    availableChallenges.find(
                      (c) => c.challenge_id === challenge.challenge_id,
                    )?.icon ||
                    "🎯";

                  return (
                    <Pressable
                      key={challenge._id}
                      style={styles.myChallengeCard}
                      onPress={() =>
                        router.push(
                          `/Screens/ChallengeDetail?id=${challenge._id}`,
                        )
                      }
                    >
                      <View style={styles.challengeHeader}>
                        <Text style={styles.challengeIcon}>
                          {challengeIcon}
                        </Text>
                        <View style={styles.challengeHeaderText}>
                          <Text style={styles.challengeTitle}>
                            {challenge.challenge_title}
                          </Text>
                          <Text style={styles.progressText}>
                            Day {challenge.current_streak || 0} of{" "}
                            {challenge.target_days}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.min(100, ((challenge.current_streak || 0) / challenge.target_days) * 100)}%`,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.challengeFooter}>
                        <Text style={styles.statusText}>In Progress</Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color="#64748B"
                        />
                      </View>
                    </Pressable>
                  );
                })
            )}
          </View>
        ) : (
          // History - Completed/Claimed Challenges
          <View style={styles.challengesList}>
            {myChallenges.filter(
              (c) => c.status === "claimed" || c.status === "completed",
            ).length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="history" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>
                  No completed challenges
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Complete challenges to see them here!
                </Text>
              </View>
            ) : (
              myChallenges
                .filter(
                  (c) => c.status === "claimed" || c.status === "completed",
                )
                .map((challenge) => {
                  const challengeIcon =
                    challenge.challenge_icon ||
                    availableChallenges.find(
                      (c) => c.challenge_id === challenge.challenge_id,
                    )?.icon ||
                    "🎯";

                  return (
                    <Pressable
                      key={challenge._id}
                      style={styles.myChallengeCard}
                      onPress={() =>
                        router.push(
                          `/Screens/ChallengeDetail?id=${challenge._id}`,
                        )
                      }
                    >
                      <View style={styles.challengeHeader}>
                        <Text style={styles.challengeIcon}>
                          {challengeIcon}
                        </Text>
                        <View style={styles.challengeHeaderText}>
                          <Text style={styles.challengeTitle}>
                            {challenge.challenge_title}
                          </Text>
                          <Text style={styles.completedText}>
                            Completed{" "}
                            {challenge.completed_at
                              ? new Date(
                                  challenge.completed_at,
                                ).toLocaleDateString()
                              : "recently"}
                          </Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color="#047857"
                          />
                        </View>
                      </View>

                      {/* Progress Bar - Full */}
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: "100%" }]} />
                      </View>

                      <View style={styles.challengeFooter}>
                        <View style={styles.rewardInfo}>
                          <MaterialIcons
                            name="stars"
                            size={16}
                            color="#F59E0B"
                          />
                          <Text style={styles.rewardText}>
                            +{challenge.reward_points} points earned
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color="#64748B"
                        />
                      </View>
                    </Pressable>
                  );
                })
            )}
          </View>
        )}
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
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#047857",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  activeTabText: {
    color: "#047857",
  },
  content: {
    flex: 1,
  },
  challengesList: {
    padding: 20,
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  challengeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  challengeHeaderText: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 20,
  },
  challengeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  durationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  challengeDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  rewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  acceptButton: {
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
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  myChallengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  progressText: {
    fontSize: 13,
    color: "#047857",
    fontWeight: "700",
  },
  completedBadge: {
    marginLeft: "auto",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginVertical: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#047857",
    borderRadius: 3,
  },
  challengeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statusText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#475569",
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: "#94A3B8",
    marginTop: 8,
  },
  completedText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  rewardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "600",
  },
});
