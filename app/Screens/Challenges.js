// Challenge listing screen that shows available, locked, active, and completed challenge states.
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionDialog from "../../components/ui/ActionDialog";
import LoadingOverlay from "../../components/ui/LoadingOverlay";
import RestrictionModal from "../../components/ui/RestrictionModal";
import { BASE_URL } from "../config";

const PRIMARY_GREEN = "#047857";
const PRIMARY_GREEN_SOFT = "#E8F7F0";
const PRIMARY_GREEN_BORDER = "#CFEFE3";

export default function Challenges() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [pendingAcceptChallenge, setPendingAcceptChallenge] = useState(null);
  const [acceptingChallengeId, setAcceptingChallengeId] = useState(null);
  const [statusDialog, setStatusDialog] = useState({
    visible: false,
    title: "",
    message: "",
    variant: "info",
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const getStoredIdentifier = async () => {
    // Challenge APIs accept a generic user_id, so we resolve the active email or mobile session here.
    const email = await AsyncStorage.getItem("email");
    const mobile = await AsyncStorage.getItem("mobile");
    return email || mobile;
  };

  const loadChallenges = async () => {
    try {
      const identifier = await getStoredIdentifier();

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // First request: challenge templates the user can start or is currently locked from restarting.
      const availableResponse = await fetch(
        `${BASE_URL}/challenges/daily-checkin?user_id=${identifier}`,
      );

      const availableData = await availableResponse.json();
      if (availableData.success) {
        setAvailableChallenges(availableData.challenges || []);
      }

      // Second request: the user's own active, completed, claimed, or failed challenge records.
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
  const closeStatusDialog = () => {
    setStatusDialog((current) => ({ ...current, visible: false }));
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      const identifier = await getStoredIdentifier();

      if (!identifier) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      setAcceptingChallengeId(challengeId);

      // Backend expects multipart form data for this mutation and creates the user_challenge record.
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
        // Reload both lists so the accepted challenge immediately moves from Available to Active.
        await loadChallenges();
        setActiveTab("my-challenges");
        setStatusDialog({
          visible: true,
          title: "Challenge added",
          message: data.message || "It is now in your active challenges.",
          variant: "success",
        });
      } else {
        if (response.status === 403) {
          setRestrictionMessage(
            data.detail || "Your account is banned from participating in challenges.",
          );
          setShowRestrictionModal(true);
        } else {
          setStatusDialog({
            visible: true,
            title: "Unable to start challenge",
            message: data.detail || data.message || "Please try again.",
            variant: "info",
          });
        }
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
      setStatusDialog({
        visible: true,
        title: "Unable to start challenge",
        message: "Failed to accept challenge. Please try again.",
        variant: "error",
      });
    } finally {
      setAcceptingChallengeId(null);
      setPendingAcceptChallenge(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChallenges();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return PRIMARY_GREEN;
      case "medium":
        return "#F59E0B";
      case "hard":
        return "#EF4444";
      default:
        return PRIMARY_GREEN;
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

  const tabItems = [
    {
      key: "available",
      label: "Available",
      count: availableChallenges.filter((c) => !c.in_cooldown).length,
    },
    {
      key: "locked",
      label: "Locked",
      count: availableChallenges.filter((c) => c.in_cooldown).length,
    },
    {
      key: "my-challenges",
      label: "Active",
      count: myChallenges.filter((c) => c.status === "in_progress").length,
    },
    {
      key: "history",
      label: "History",
      count: myChallenges.filter(
        (c) => c.status === "claimed" || c.status === "completed",
      ).length,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 10, 50) },
        ]}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, isActive && styles.activeTabPill]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabPillText, isActive && styles.activeTabPillText]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[styles.tabCount, isActive && styles.activeTabCount]}
                >
                  <Text
                    style={[
                      styles.tabCountText,
                      isActive && styles.activeTabCountText,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
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
                    <View style={styles.challengeStack}>
                      {filteredChallenges.map((challenge) => (
                        <View
                          key={challenge.challenge_id}
                          style={styles.challengeCard}
                        >
                          <View style={styles.cardHeader}>
                            <View style={styles.cardIntro}>
                              <View style={styles.iconContainer}>
                                <MaterialIcons
                                  name={getChallengeIcon(challenge.challenge_id)}
                                  size={22}
                                  color={PRIMARY_GREEN}
                                />
                              </View>
                              <View style={styles.cardTextBlock}>
                                <Text style={styles.challengeTitle} numberOfLines={2}>
                                  {challenge.title}
                                </Text>
                                <Text style={styles.description} numberOfLines={2}>
                                  {challenge.description}
                                </Text>
                              </View>
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
                          <View style={styles.cardFooter}>
                            <View style={styles.metaInfo}>
                              <View style={styles.metaChip}>
                                <MaterialIcons
                                  name="schedule"
                                  size={14}
                                  color="#6B7280"
                                />
                                <Text style={styles.durationText}>
                                  {challenge.duration_days} days
                                </Text>
                              </View>
                              <View style={styles.metaChip}>
                                <MaterialIcons
                                  name="stars"
                                  size={14}
                                  color="#F59E0B"
                                />
                                <Text style={styles.rewardText}>
                                  {challenge.reward_points} pts
                                </Text>
                              </View>
                            </View>

                            <Pressable
                              style={[
                                styles.acceptButton,
                                acceptingChallengeId === challenge.challenge_id &&
                                  styles.buttonDisabled,
                              ]}
                              onPress={() => setPendingAcceptChallenge(challenge)}
                              disabled={acceptingChallengeId === challenge.challenge_id}
                            >
                              {acceptingChallengeId === challenge.challenge_id ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={styles.acceptButtonText}>Start challenge</Text>
                              )}
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
                <View style={styles.challengeStack}>
                  {lockedChallenges.map((challenge) => (
                    <View
                      key={challenge.challenge_id}
                      style={[styles.challengeCard, styles.lockedCard]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIntro}>
                          <View
                            style={[
                              styles.iconContainer,
                              styles.lockedIconContainer,
                            ]}
                          >
                            <MaterialIcons
                              name={getChallengeIcon(challenge.challenge_id)}
                              size={22}
                              color="#9CA3AF"
                            />
                          </View>
                          <View style={styles.cardTextBlock}>
                            <Text style={styles.challengeTitle} numberOfLines={2}>
                              {challenge.title}
                            </Text>
                            <Text style={styles.description} numberOfLines={2}>
                              {challenge.description}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.completedBadge}>
                          <MaterialIcons
                            name="check-circle"
                            size={12}
                            color="#fff"
                          />
                          <Text style={styles.completedBadgeText}>COMPLETED</Text>
                        </View>
                      </View>

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
                          <View style={styles.cooldownProgressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${((7 - challenge.cooldown_days_left) / 7) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.cooldownProgressText}>
                            {Math.round(
                              ((7 - challenge.cooldown_days_left) / 7) * 100,
                            )}
                            % complete
                          </Text>
                        </View>
                      </View>

                      <Pressable style={styles.lockedButton} disabled>
                        <MaterialIcons name="lock" size={16} color="#9CA3AF" />
                        <Text style={styles.lockedButtonText}>Cooldown active</Text>
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
                            color={PRIMARY_GREEN}
                          />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.challengeTitle}>
                            {challenge.challenge_title}
                          </Text>
                          <Text style={styles.streakText}>
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
                            styles.streakProgressFill,
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
                              color={isFailed ? "#EF4444" : PRIMARY_GREEN}
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
                                  : styles.historyCompletedText
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
                            color={isFailed ? "#EF4444" : PRIMARY_GREEN}
                          />
                        </View>

                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                            styles.streakProgressFill,
                              {
                                width: isFailed
                                  ? `${Math.min(100, ((challenge.current_streak || 0) / challenge.target_days) * 100)}%`
                                  : "100%",
                                backgroundColor: isFailed
                                  ? "#EF4444"
                                  : PRIMARY_GREEN,
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

      <RestrictionModal
        visible={showRestrictionModal}
        title="Challenges Restricted"
        message={restrictionMessage}
        icon="emoji-events"
        onClose={() => setShowRestrictionModal(false)}
      />

      <ActionDialog
        visible={!!pendingAcceptChallenge}
        title="Start challenge?"
        message={
          pendingAcceptChallenge
            ? `"${pendingAcceptChallenge.title}" will be added to your active list.`
            : ""
        }
        variant="confirm"
        confirmLabel="Start Challenge"
        cancelLabel="Not now"
        onClose={() => setPendingAcceptChallenge(null)}
        onConfirm={() =>
          pendingAcceptChallenge &&
          handleAcceptChallenge(pendingAcceptChallenge.challenge_id)
        }
        confirmDisabled={!!acceptingChallengeId}
      />

      <ActionDialog
        visible={statusDialog.visible}
        title={statusDialog.title}
        message={statusDialog.message}
        variant={statusDialog.variant}
        confirmLabel="Got it"
        showCancelButton={false}
        onClose={closeStatusDialog}
        onConfirm={closeStatusDialog}
      />

      <LoadingOverlay
        visible={!!acceptingChallengeId}
        title="Starting challenge"
        message="This may take a moment."
      />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  tabsSection: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeTabPill: {
    backgroundColor: PRIMARY_GREEN_SOFT,
    borderColor: PRIMARY_GREEN_BORDER,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabPillText: {
    color: PRIMARY_GREEN,
  },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  activeTabCount: {
    backgroundColor: PRIMARY_GREEN,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  activeTabCountText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  challengesList: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterChip: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeFilterChipText: {
    color: "#fff",
  },
  challengeStack: {
    gap: 12,
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  cardIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  cardTextBlock: {
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY_GREEN_SOFT,
    justifyContent: "center",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  challengeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  cardFooter: {
    gap: 12,
  },
  metaInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  activeChallengesList: {
    gap: 16,
  },
  activeChallengeCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
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
  streakText: {
    fontSize: 13,
    color: PRIMARY_GREEN,
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginVertical: 12,
    overflow: "hidden",
  },
  streakProgressFill: {
    height: "100%",
    backgroundColor: PRIMARY_GREEN,
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
    borderRadius: 18,
    padding: 16,
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
  historyCompletedText: {
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
    paddingVertical: 56,
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
    backgroundColor: "#FCFCFD",
  },
  lockedIconContainer: {
    backgroundColor: "#F3F4F6",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cooldownContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  cooldownProgressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 3,
  },
  cooldownProgressText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "left",
  },
  lockedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  lockedButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
