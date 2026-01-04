import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const CO2CalculatorLanding = () => {
  const router = useRouter();
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh data when screen comes into focus (after completing quiz)
  useFocusEffect(
    React.useCallback(() => {
      fetchLatestResult();
    }, [])
  );

  useEffect(() => {
    fetchLatestResult();
  }, []);

  const fetchLatestResult = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      if (!mobile) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${BASE_URL}/carbon-footprint/latest/${mobile}`
      );
      const data = await response.json();

      if (response.ok && data.success && data.hasResult) {
        setLatestResult(data.result);
      }
    } catch (err) {
      console.error("Error fetching latest result:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    router.push("/Screens/CO2Calculator");
  };

  const getCO2LevelInfo = (level) => {
    switch (level) {
      case "Excellent":
        return { color: "#10B981", icon: "eco", emoji: "🌟" };
      case "Good":
        return { color: "#3B82F6", icon: "thumb-up", emoji: "👍" };
      case "Average":
        return { color: "#F59E0B", icon: "info", emoji: "⚠️" };
      case "High":
        return { color: "#EF4444", icon: "warning", emoji: "🔴" };
      default:
        return { color: "#6366F1", icon: "eco", emoji: "🌍" };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const levelInfo = latestResult
    ? getCO2LevelInfo(latestResult.impactLevel)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Simple Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Carbon Footprint</Text>
        </View>

        {/* Latest Result Card (if exists) */}
        {latestResult && (
          <Animatable.View animation="fadeIn" style={styles.resultCard}>
            <View style={styles.resultTop}>
              <View>
                <Text style={styles.resultLabel}>Your Daily Footprint</Text>
                <View style={styles.resultScoreRow}>
                  <Text style={styles.resultScore}>
                    {latestResult.totalCO2.toFixed(1)}
                  </Text>
                  <Text style={styles.resultUnit}>kg CO₂/day</Text>
                </View>
              </View>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: levelInfo.color + "20" },
                ]}
              >
                <Text style={[styles.levelText, { color: levelInfo.color }]}>
                  {latestResult.impactLevel}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultBottom}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{latestResult.yearlyTons}t</Text>
                <Text style={styles.miniStatLabel}>per year</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{latestResult.treesNeeded}</Text>
                <Text style={styles.miniStatLabel}>trees needed</Text>
              </View>
              <Text style={styles.resultDate}>
                {new Date(latestResult.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </Animatable.View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>
            {latestResult ? "Track today's footprint" : "Start tracking your daily CO₂"}
          </Text>
          <Text style={styles.sectionDesc}>
            Quick daily quiz about your habits - takes 2-3 minutes
          </Text>

          {/* Categories */}
          <View style={styles.categoriesWrap}>
            <View style={styles.categoryItem}>
              <MaterialIcons name="directions-car" size={16} color="#3B82F6" />
              <Text style={styles.categoryLabel}>Transport</Text>
            </View>
            <View style={styles.categoryItem}>
              <MaterialIcons name="bolt" size={16} color="#F59E0B" />
              <Text style={styles.categoryLabel}>Energy</Text>
            </View>
            <View style={styles.categoryItem}>
              <MaterialIcons name="restaurant" size={16} color="#10B981" />
              <Text style={styles.categoryLabel}>Food</Text>
            </View>
            <View style={styles.categoryItem}>
              <MaterialIcons name="delete" size={16} color="#EF4444" />
              <Text style={styles.categoryLabel}>Waste</Text>
            </View>
            <View style={styles.categoryItem}>
              <MaterialIcons name="shopping-bag" size={16} color="#8B5CF6" />
              <Text style={styles.categoryLabel}>Shopping</Text>
            </View>
            <View style={styles.categoryItem}>
              <MaterialIcons name="water-drop" size={16} color="#06B6D4" />
              <Text style={styles.categoryLabel}>Water</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <MaterialIcons name="timer" size={18} color="#64748B" />
              <Text style={styles.featureText}>Takes 2-3 minutes</Text>
            </View>
            <View style={styles.feature}>
              <MaterialIcons name="insights" size={18} color="#64748B" />
              <Text style={styles.featureText}>Get personalized tips</Text>
            </View>
            <View style={styles.feature}>
              <MaterialIcons name="trending-down" size={18} color="#64748B" />
              <Text style={styles.featureText}>Track your progress</Text>
            </View>
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.buttonWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleStartQuiz}
          >
            <Text style={styles.startButtonText}>
              {latestResult ? "Track Today" : "Start Tracking"}
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 12,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resultTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
    fontWeight: "500",
  },
  resultScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  resultScore: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -1,
  },
  resultUnit: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  miniStat: {
    gap: 2,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  miniStatLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  resultDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginLeft: "auto",
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 20,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#475569",
  },
  buttonWrap: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  bottomSpace: {
    height: 40,
  },
});

export default CO2CalculatorLanding;
