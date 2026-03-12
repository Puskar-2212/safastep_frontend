import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import { BASE_URL } from "../../constants/config";

const { width } = Dimensions.get("window");

const CarbonFootprintHistory = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const response = await fetch(`${BASE_URL}/carbon-footprint/history/${mobile}?limit=10`);
      const result = await response.json();

      if (response.ok && result.success) {
        setHistory(result.results);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const response = await fetch(`${BASE_URL}/carbon-footprint/stats/${mobile}`);
      const result = await response.json();

      if (response.ok && result.success && result.hasData) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const getImpactColor = (level) => {
    switch (level) {
      case "Excellent": return "#047857";
      case "Good": return "#3B82F6";
      case "Average": return "#F59E0B";
      case "High": return "#EF4444";
      default: return "#64748B";
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </Pressable>
          <Text style={styles.headerTitle}>Carbon Footprint History</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          <MaterialIcons name="eco" size={64} color="#CBD5E1" />
          <Text style={styles.emptyStateTitle}>No History Yet</Text>
          <Text style={styles.emptyStateText}>
            Complete the CO₂ calculator quiz to start tracking your carbon footprint!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Summary - Simplified */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons 
                  name={stats.improvement > 0 ? "trending-down" : "trending-up"} 
                  size={20} 
                  color={stats.improvement > 0 ? "#047857" : "#EF4444"} 
                />
              </View>
              <Text style={styles.statValue}>
                {stats.improvement > 0 ? `-${stats.improvement}%` : `+${Math.abs(stats.improvement)}%`}
              </Text>
              <Text style={styles.statLabel}>Change</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="assessment" size={20} color="#047857" />
              </View>
              <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
              <Text style={styles.statLabel}>Quizzes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="eco" size={20} color="#047857" />
              </View>
              <Text style={styles.statValue}>{stats.bestScore.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
          </View>
        )}

        {/* History List - Simplified */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Quizzes</Text>
          {history.map((item, index) => (
            <Animatable.View
              key={item._id}
              animation="fadeInUp"
              delay={index * 50}
              style={styles.historyCard}
            >
              {/* Header Row */}
              <View style={styles.historyHeader}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>
                    {new Date(item.timestamp * 1000).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <View style={[
                    styles.historyBadge,
                    { backgroundColor: getImpactColor(item.impactLevel) }
                  ]}>
                    <Text style={styles.historyBadgeText}>{item.impactLevel}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyCO2}>{item.totalCO2.toFixed(1)}</Text>
                  <Text style={styles.historyCO2Unit}>kg/day</Text>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <MaterialIcons name="calendar-today" size={12} color="#94A3B8" />
                  <Text style={styles.quickStatText}>{item.yearlyTons} tons/yr</Text>
                </View>
                <View style={styles.quickStat}>
                  <MaterialIcons name="park" size={12} color="#94A3B8" />
                  <Text style={styles.quickStatText}>{item.treesNeeded} trees</Text>
                </View>
              </View>

              {/* Top 3 Categories Only */}
              <View style={styles.topCategories}>
                {Object.entries(item.breakdown)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 3)
                  .map(([category, data]) => (
                    <View key={category} style={styles.categoryChip}>
                      <Text style={styles.categoryChipName}>{category}</Text>
                      <Text style={styles.categoryChipValue}>{data.total.toFixed(1)} kg</Text>
                    </View>
                  ))}
              </View>
            </Animatable.View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FE",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8F9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },

  historySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyCO2: {
    fontSize: 22,
    fontWeight: "800",
    color: "#047857",
  },
  historyCO2Unit: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  quickStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  quickStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickStatText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  topCategories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8F9FE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryChipName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  categoryChipValue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
});

export default CarbonFootprintHistory;


