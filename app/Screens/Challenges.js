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
  const [activeTab, setActiveTab] = useState("available");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

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
        `${BASE_URL}/challenges/daily-checkin?user_id=${identifier}`,
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
        Alert.alert("Success!", data.message, [
          {
            text: "OK",
            onPress: () => {
              loadChallenges();
              setActiveTab("my-challenges");
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
        return "#10B981";
      case "medium":
        return "#F59E0B";
      case "hard":
        return "#EF4444";
      default:
        return "#10B981";
    }
  };

  const getChallengeIcon = (challengeId) => {
    const iconMap = {
      quick_eco_pledge: "eco",
      lights_out_today: "lightbulb-outline",
      water_bottle_day: "water-drop",
      no_plastic_bags_3day: "shopping-bag",
      meatless_monday: "restaurant",
      digital_detox_day: "phone-off",
      plastic_free_7day: "delete-outline",
      public_transport_14day: "directions-bus",
      zero_waste_7day: "recycling",
      energy_saver_7day: "bolt",
      reusable_bag_21day: "shopping-bag",
      vegetarian_30day: "local-florist",
    };
    return iconMap[challengeId] || "flag";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
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
          style={[styles.tab, activeTab === "locked" && styles.activeTab]}
          onPress={() => setActiveTab("locked")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "locked" && styles.activeTabText,
            ]}
          >
            Locked ({availableChallenges.filter((c) => c.in_cooldown).length})
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
            History (
            {
              myChallenges.filter(
                (c) => c.status === "claimed" || c.status === "completed",
              ).length
            }
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
          <View style={styles.challengesList}>
            {/* Only show available challenges (no locked ones) */}
            {(() => {
              // Filter out locked challenges completely from available tab
              const availableOnly = availableChallenges.filter(
                (c) => !c.in_cooldown,
              );

              // Apply difficulty filter
              const filteredChallenges =
                selectedDifficulty === "all"
                  ? availableOnly
                  : availableOnly.filter(
                      (challenge) =>
                        challenge.difficulty === selectedDifficulty,
                    );

              if (availableOnly.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <MaterialIcons
                      name="assignment"
                      size={64}
                      color="#D1D5DB"
                    />
                    <Text style={styles.emptyTitle}>
                      No challenges available
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      Check back later for new challenges
                    </Text>
                  </View>
                );
              }

              return (
                <>
                  {/* Difficulty Filter - Clean horizontal chips */}
                  <View style={styles.filterSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterScrollContent}
                    >
                      {["all", "easy", "medium", "hard"].map((difficulty) => (
                        <Pressable
                          key={difficulty}
                          style={[
                            styles.filterChip,
                            selectedDifficulty === difficulty &&
                              styles.activeFilterChip,
                          ]}
                          onPress={() => setSelectedDifficulty(difficulty)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              selectedDifficulty === difficulty &&
                                styles.activeFilterChipText,
                            ]}
                          >
                            {difficulty === "all"
                              ? "All Levels"
                              : difficulty.charAt(0).toUpperCase() +
                                difficulty.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Challenges Grid */}
                  {filteredChallenges.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons
                        name="filter-list"
                        size={64}
                        color="#D1D5DB"
                      />
                      <Text style={styles.emptyTitle}>
                        No {selectedDifficulty} challenges available
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        Try selecting a different difficulty level
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.challengesGrid}>
                      {filteredChallenges.map((challenge) => (
                        <View
                          key={challenge.challenge_id}
                          style={styles.challengeCard}
                        >
                          <View style={styles.cardHeader}>
                            <View style={styles.iconContainer}>
                              <MaterialIcons
                                name={getChallengeIcon(challenge.challenge_id)}
                                size={28}
                                color="#10B981"
                              />
                            </View>
                            <View
                              style={[
                                styles.difficultyBadge,
                                {
                                  backgroundColor: getDifficultyColor(
                                    challenge.difficulty,
                                  ),
                                },
                              ]}
                            >
                              <Text style={styles.difficultyText}>
                                {challenge.difficulty.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.challengeTitle} numberOfLines={2}>
                            {challenge.title}
                          </Text>

                          <Text style={styles.description} numberOfLines={3}>
                            {challenge.description}
                          </Text>

                          <View style={styles.cardFooter}>
                            <View style={styles.metaInfo}>
                              <View style={styles.durationInfo}>
                                <MaterialIcons
                                  name="schedule"
                                  size={16}
                                  color="#6B7280"
                                />
                                <Text style={styles.durationText}>
                                  {challenge.duration_days} days
                                </Text>
                              </View>
                              <View style={styles.rewardInfo}>
                                <MaterialIcons
                                  name="stars"
                                  size={16}
                                  color="#F59E0B"
                                />
                                <Text style={styles.rewardText}>
                                  {challenge.reward_points} pts
                                </Text>
                              </View>
                            </View>

                            <Pressable
                              style={styles.acceptButton}
                              onPress={() =>
                                handleAcceptChallenge(challenge.challenge_id)
                              }
                            >
                              <Text style={styles.acceptButtonText}>Start</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        ) : activeTab === "locked" ? (
          <View style={styles.challengesList}>
            {(() => {
              // Show only locked challenges (in cooldown)
              const lockedChallenges = availableChallenges.filter(
                (c) => c.in_cooldown,
              );

              if (lockedChallenges.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="lock" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No locked challenges</Text>
                    <Text style={styles.emptySubtitle}>
                      Complete some challenges to see them here during cooldown
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.challengesGrid}>
                  {lockedChallenges.map((challenge) => (
                    <View
                      key={challenge.challenge_id}
                      style={[styles.challengeCard, styles.lockedCard]}
                    >
                      <View style={styles.cardHeader}>
                        <View
                          style={[
                            styles.iconContainer,
                            styles.lockedIconContainer,
                          ]}
                        >
                          <MaterialIcons
                            name={getChallengeIcon(challenge.challenge_id)}
                            size={28}
                            color="#9CA3AF"
                          />
                        </View>
                        <View style={styles.completedBadge}>
                          <MaterialIcons
                            name="check-circle"
                            size={12}
                            color="#fff"
                          />
                          <Text style={styles.completedText}>COMPLETED</Text>
                        </View>
                      </View>

                      <Text style={styles.challengeTitle} numberOfLines={2}>
                        {challenge.title}
                      </Text>

                      <Text style={styles.description} numberOfLines={3}>
                        {challenge.description}
                      </Text>

                      <View style={styles.cooldownContainer}>
                        <View style={styles.cooldownInfo}>
                          <MaterialIcons
                            name="access-time"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.cooldownText}>
                            Available in {challenge.cooldown_days_left} day
                            {challenge.cooldown_days_left !== 1 ? "s" : ""}
                          </Text>
                        </View>

                        <View style={styles.progressContainer}>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${((7 - challenge.cooldown_days_left) / 7) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {Math.round(
                              ((7 - challenge.cooldown_days_left) / 7) * 100,
                            )}
                            % complete
                          </Text>
                        </View>
                      </View>

                      <Pressable style={styles.lockedButton} disabled>
                        <MaterialIcons name="lock" size={16} color="#9CA3AF" />
                        <Text style={styles.lockedButtonText}>Locked</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        ) : activeTab === "my-challenges" ? (
          <View style={styles.challengesList}>
            {myChallenges.filter((c) => c.status === "in_progress").length ===
            0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="flag" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No active challenges</Text>
                <Text style={styles.emptySubtitle}>
                  Accept a challenge to get started!
                </Text>
              </View>
            ) : (
              <View style={styles.activeChallengesList}>
                {myChallenges
                  .filter((c) => c.status === "in_progress")
                  .map((challenge) => (
                    <Pressable
                      key={challenge._id}
                      style={styles.activeChallengeCard}
                      onPress={() =>
                        router.push(
                          `/Screens/ChallengeDetail?id=${challenge._id}`,
                        )
                      }
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                          <MaterialIcons
                            name={getChallengeIcon(challenge.challenge_id)}
                            size={28}
                            color="#10B981"
                          />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.challengeTitle}>
                            {challenge.challenge_title}
                          </Text>
                          <Text style={styles.progressText}>
                            Day {challenge.current_streak || 0} of{" "}
                            {challenge.target_days}
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color="#9CA3AF"
                        />
                      </View>

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

                      <View style={styles.cardFooter}>
                        <Text style={styles.statusText}>In Progress</Text>
                        <View style={styles.rewardInfo}>
                          <MaterialIcons
                            name="stars"
                            size={16}
                            color="#F59E0B"
                          />
                          <Text style={styles.rewardText}>
                            {challenge.reward_points} pts
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        ) : (
          // History Tab
          <View style={styles.challengesList}>
            {myChallenges.filter(
              (c) =>
                c.status === "claimed" ||
                c.status === "completed" ||
                c.status === "failed",
            ).length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="history" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No completed challenges</Text>
                <Text style={styles.emptySubtitle}>
                  Complete challenges to see them here!
                </Text>
              </View>
            ) : (
              <View style={styles.historyChallengesList}>
                {myChallenges
                  .filter(
                    (c) =>
                      c.status === "claimed" ||
                      c.status === "completed" ||
                      c.status === "failed",
                  )
                  .map((challenge) => {
                    const isFailed = challenge.status === "failed";
                    return (
                      <Pressable
                        key={challenge._id}
                        style={[
                          styles.historyChallengeCard,
                          isFailed && styles.failedCard,
                        ]}
                        onPress={() =>
                          router.push(
                            `/Screens/ChallengeDetail?id=${challenge._id}`,
                          )
                        }
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.iconContainer}>
                            <MaterialIcons
                              name={getChallengeIcon(challenge.challenge_id)}
                              size={28}
                              color={isFailed ? "#EF4444" : "#10B981"}
                            />
                          </View>
                          <View style={styles.cardContent}>
                            <Text style={styles.challengeTitle}>
                              {challenge.challenge_title}
                            </Text>
                            <Text
                              style={
                                isFailed
                                  ? styles.failedText
                                  : styles.completedText
                              }
                            >
                              {isFailed
                                ? `Failed - ${challenge.failure_reason || "Missed too many days"}`
                                : `Completed ${
                                    challenge.completed_at
                                      ? new Date(
                                          challenge.completed_at,
                                        ).toLocaleDateString()
                                      : "recently"
                                  }`}
                            </Text>
                          </View>
                          <MaterialIcons
                            name={isFailed ? "close" : "check-circle"}
                            size={24}
                            color={isFailed ? "#EF4444" : "#10B981"}
                          />
                        </View>

                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              {
                                width: isFailed
                                  ? `${Math.min(100, ((challenge.current_streak || 0) / challenge.target_days) * 100)}%`
                                  : "100%",
                                backgroundColor: isFailed
                                  ? "#EF4444"
                                  : "#10B981",
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.cardFooter}>
                          {!isFailed && (
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
                          )}
                          {isFailed && (
                            <Text style={styles.failedStatusText}>
                              Challenge Failed
                            </Text>
                          )}
                          <MaterialIcons
                            name="chevron-right"
                            size={20}
                            color="#9CA3AF"
                          />
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
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
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#10B981",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#10B981",
  },
  content: {
    flex: 1,
  },
  challengesList: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterChip: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeFilterChipText: {
    color: "#fff",
  },
  challengesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "48%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    gap: 12,
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  rewardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  acceptButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  activeChallengesList: {
    gap: 16,
  },
  activeChallengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginVertical: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  historyChallengesList: {
    gap: 16,
  },
  historyChallengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  completedText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  failedText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  failedStatusText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  lockedCard: {
    backgroundColor: "#F9FAFB",
    opacity: 0.85,
  },
  lockedIconContainer: {
    backgroundColor: "#F3F4F6",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cooldownContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  cooldownInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  lockedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  lockedButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
