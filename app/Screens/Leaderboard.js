// Community leaderboard screen that ranks users by eco points and carbon impact.
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../constants/config";

const Leaderboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'week', 'month', 'all'
  const [scaleAnim] = useState(new Animated.Value(0));
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserIdentifier, setCurrentUserIdentifier] = useState(null);

  useEffect(() => {
    loadUserIdentifier();
    // Animate champion on mount
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (currentUserIdentifier) {
      fetchLeaderboard();
      fetchUserRank();
    }
  }, [selectedFilter, currentUserIdentifier]);

  const loadUserIdentifier = async () => {
    try {
      // Leaderboard highlighting depends on knowing whether the current row belongs to the logged-in user.
      const email = await AsyncStorage.getItem("email");
      const mobile = await AsyncStorage.getItem("mobile");
      const identifier = email || mobile;
      setCurrentUserIdentifier(identifier);
    } catch (error) {
      console.error("Error loading user identifier:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Period filter is sent to the backend so ranking and totals are computed server-side.
      const response = await fetch(
        `${BASE_URL}/leaderboard?period=${selectedFilter}&limit=50`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      const result = await response.json();

      if (response.ok && result.success) {
        // Convert backend ranking objects into the display model used by the podium and list cards.
        const transformedData = result.leaderboard.map((user) => {
          const isCurrentUser = user.identifier === currentUserIdentifier;
          return {
            rank: user.rank,
            name: isCurrentUser ? "You" : user.name,
            initials: isCurrentUser
              ? "YOU"
              : `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            co2Reduced: user.co2Reduced,
            carbonCredit: user.ecoPoints,
            profilePicture: user.profilePicture,
            active: user.postCount > 2,
            isCurrentUser: isCurrentUser,
          };
        });
        setLeaderboardData(transformedData);
      } else {
        console.error("Failed to fetch leaderboard:", result);
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    if (!currentUserIdentifier) return;

    try {
      // This separate lookup lets the current user see their own rank even if they are outside the top visible list.
      const response = await fetch(
        `${BASE_URL}/leaderboard/user/${currentUserIdentifier}?period=${selectedFilter}`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      const result = await response.json();

      if (response.ok && result.success && result.rank) {
        setCurrentUserRank(result.rank);
      } else {
        setCurrentUserRank(null);
      }
    } catch (error) {
      console.error("Error fetching user rank:", error);
      setCurrentUserRank(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    await fetchUserRank();
    setRefreshing(false);
  };

  const renderTopThree = () => {
    const top3 = leaderboardData.slice(0, 3);
    if (top3.length === 0) return null;

    // If we have less than 3, just show what we have in order
    if (top3.length < 3) {
      return (
        <View style={styles.podiumContainer}>
          {top3.map((user, index) => (
            <Animatable.View
              key={user.rank}
              animation="fadeInUp"
              duration={600}
              delay={index * 100}
              style={styles.podiumItem}
            >
              <View style={[styles.podiumAvatar, styles.championAvatar]}>
                <Text style={[styles.avatarText, styles.championAvatarText]}>
                  {user.initials}
                </Text>
                <View style={[styles.medalBadge, styles.goldBadge]}>
                  <Text style={styles.medalText}>{user.rank}</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>{user.name.split(" ")[0]}</Text>
              <View style={[styles.creditBox, styles.championCreditBox]}>
                <Text style={styles.creditNumber}>{user.carbonCredit}</Text>
                <Text style={styles.creditLabel}>Points</Text>
              </View>
            </Animatable.View>
          ))}
        </View>
      );
    }

    // Arrange as: 2nd, 1st, 3rd
    const arranged = [top3[1], top3[0], top3[2]];

    return (
      <View style={styles.podiumContainer}>
        {arranged.map((user, index) => {
          const actualRank = index === 1 ? 1 : index === 0 ? 2 : 3;
          const isChampion = actualRank === 1;

          return (
            <Animatable.View
              key={user.rank}
              animation={isChampion ? "pulse" : "fadeInUp"}
              iterationCount={isChampion ? "infinite" : 1}
              iterationDelay={isChampion ? 2000 : 0}
              duration={isChampion ? 1500 : 600}
              delay={index * 100}
              style={[styles.podiumItem, isChampion && styles.championItem]}
            >
              {/* Sparkle effect for champion */}
              {isChampion && (
                <Animatable.View
                  animation="rotate"
                  iterationCount="infinite"
                  duration={3000}
                  style={styles.sparkleTop}
                >
                  <Ionicons name="sparkles" size={18} color="#facc15" />
                </Animatable.View>
              )}

              <View
                style={[
                  styles.podiumAvatar,
                  actualRank === 1 && styles.championAvatar,
                  actualRank === 2 && styles.secondAvatar,
                  actualRank === 3 && styles.thirdAvatar,
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    isChampion && styles.championAvatarText,
                  ]}
                >
                  {user.initials}
                </Text>

                {/* Medal badge */}
                <View
                  style={[
                    styles.medalBadge,
                    actualRank === 1 && styles.goldBadge,
                    actualRank === 2 && styles.silverBadge,
                    actualRank === 3 && styles.bronzeBadge,
                  ]}
                >
                  <Text style={styles.medalText}>{actualRank}</Text>
                </View>
              </View>

              <Text style={styles.podiumName}>{user.name.split(" ")[0]}</Text>

              <View
                style={[
                  styles.creditBox,
                  isChampion && styles.championCreditBox,
                ]}
              >
                <Text style={styles.creditNumber}>{user.carbonCredit}</Text>
                <Text style={styles.creditLabel}>Credits</Text>
              </View>
            </Animatable.View>
          );
        })}
      </View>
    );
  };

  const renderListItem = (user, index) => {
    return (
      <Animatable.View
        key={user.rank}
        animation="fadeInRight"
        delay={index * 50}
        style={styles.listItem}
      >
        <View style={styles.rankBadge}>
          <Text style={styles.rankNumber}>{user.rank}</Text>
        </View>

        <View style={styles.listAvatar}>
          <Text style={styles.listAvatarText}>{user.initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            {user.active && (
              <View style={styles.activeBadge}>
                <Ionicons name="leaf" size={12} color="#047857" />
              </View>
            )}
          </View>
          <View style={styles.co2Row}>
            <Ionicons name="leaf-outline" size={14} color="#6b7280" />
            <Text style={styles.co2Text}>{user.co2Reduced} tCO₂ Reduced</Text>
          </View>
        </View>

        <View style={styles.creditBadge}>
          <Ionicons name="leaf" size={16} color="#fff" />
          <Text style={styles.creditBadgeNumber}>{user.carbonCredit}</Text>
        </View>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#047857" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={["#047857", "#047857"]}
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 10, 50) },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animatable.View
            animation="rotate"
            iterationCount="infinite"
            duration={3000}
          >
            <Ionicons name="sparkles" size={18} color="#facc15" />
          </Animatable.View>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Compete & Save the Planet</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === "week" && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter("week")}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === "week" && styles.filterTextActive,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === "month" && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter("month")}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === "month" && styles.filterTextActive,
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === "all" && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === "all" && styles.filterTextActive,
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top 3 Podium */}
        {renderTopThree()}
      </LinearGradient>

      {/* List Section */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Other Champions</Text>
          <View style={styles.activeBadgeLarge}>
            <Ionicons name="leaf" size={14} color="#047857" />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {leaderboardData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Champions Yet</Text>
              <Text style={styles.emptyStateText}>
                Be the first to make an eco-impact! Create posts to earn points
                and climb the leaderboard.
              </Text>
            </View>
          ) : (
            <>
              {leaderboardData
                .slice(3)
                .map((user, index) => renderListItem(user, index))}

              {/* Current User Position */}
              {currentUserRank && (
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={2000}
                  style={styles.yourPositionCard}
                >
                  <View style={styles.youBadge}>
                    <Text style={styles.youText}>YOU</Text>
                  </View>
                  <View style={styles.yourPositionContent}>
                    <Text style={styles.yourPositionTitle}>Your Position</Text>
                    <Text style={styles.yourPositionSubtitle}>
                      Keep climbing
                    </Text>
                  </View>
                  <View style={styles.yourRankBadge}>
                    <Text style={styles.yourRankNumber}>
                      #{currentUserRank}
                    </Text>
                    <Text style={styles.yourRankLabel}>Rank</Text>
                  </View>
                </Animatable.View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleIcon: {
    fontSize: 24,
  },
  headerContent: {
    position: "absolute",
    top: 50,
    left: 80,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
    marginBottom: 25,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  filterTabActive: {
    backgroundColor: "#fff",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  filterTextActive: {
    color: "#047857",
  },
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 15,
    marginTop: 10,
  },
  podiumItem: {
    alignItems: "center",
    width: 100,
  },
  championItem: {
    transform: [{ scale: 1.15 }],
  },
  sparkleTop: {
    position: "absolute",
    top: -20,
    right: 10,
  },
  sparkle: {
    fontSize: 20,
  },
  podiumAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 8,
    position: "relative",
  },
  championAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fbbf24",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  secondAvatar: {
    backgroundColor: "#d1d5db",
  },
  thirdAvatar: {
    backgroundColor: "#fb923c",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6b7280",
  },
  championAvatarText: {
    fontSize: 32,
    color: "#fff",
  },
  medalBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  goldBadge: {
    borderColor: "#fbbf24",
  },
  silverBadge: {
    borderColor: "#9ca3af",
  },
  bronzeBadge: {
    borderColor: "#fb923c",
  },
  medalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
  },
  podiumName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  creditBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 10,
    minWidth: 70,
    alignItems: "center",
  },
  championCreditBox: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  creditNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  creditLabel: {
    fontSize: 11,
    color: "#fff",
    marginTop: 2,
  },
  listSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 20,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  activeBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E6F4F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    marginBottom: 10,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#047857",
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6b7280",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  activeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
  },
  co2Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  co2Text: {
    fontSize: 13,
    color: "#6b7280",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#047857",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  creditBadgeNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  yourPositionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#047857",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  youBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  youText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#047857",
  },
  yourPositionContent: {
    flex: 1,
  },
  yourPositionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  yourPositionSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  yourRankBadge: {
    alignItems: "center",
  },
  yourRankNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  yourRankLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default Leaderboard;


