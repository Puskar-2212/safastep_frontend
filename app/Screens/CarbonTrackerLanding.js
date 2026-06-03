// Landing screen for the carbon tracker with latest-result preview and quick actions.
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../constants/config";

const ACCENT = "#0C8A4B";
const BG = "#F8F9FA";
const SURFACE = "#FFFFFF";
const TEXT = "#191C1D";
const MUTED = "#5F6B66";
const BORDER = "#E1E3E4";
const API_JSON_HEADERS = {
  "ngrok-skip-browser-warning": "true",
};

const trackerHighlights = [
  {
    icon: "today",
    title: "Track one real day",
    text: "Log what you actually traveled, ate, used, and wasted today.",
  },
  {
    icon: "calculate",
    title: "Get a real estimate",
    text: "Your total is calculated from category-specific factors across transport, food, energy, and waste.",
  },
  {
    icon: "insights",
    title: "See what drove it",
    text: "View your biggest source for the day and compare your saved check-ins over time.",
  },
];

const sections = [
  "Transport distance and mode",
  "Food portions like grams of beef or rice, glasses of milk, and eggs",
  "Electricity use in kWh",
  "Waste generated like bags, bottles, wrappers, paper, and cardboard",
];

const CarbonTrackerLanding = ({ embedded = false }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0);
  const [checkingHistory, setCheckingHistory] = useState(true);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    const checkHistory = async () => {
      try {
        const email = await AsyncStorage.getItem("email");
        const mobile = await AsyncStorage.getItem("mobile");
        const identifier = email || mobile;

        if (!identifier) {
          setHasHistory(false);
          return;
        }

        const response = await fetch(
          `${BASE_URL}/carbon-footprint/latest/${identifier}?sourceType=daily_checkin`,
          {
            headers: API_JSON_HEADERS,
          },
        );
        const rawText = await response.text();
        const result = rawText ? JSON.parse(rawText) : {};

        setHasHistory(
          Boolean(
            response.ok &&
              result.success &&
              (result.hasResult || result.hasData || result.result),
          ),
        );
      } catch (error) {
        console.error("Error checking tracker history:", error);
        setHasHistory(false);
      } finally {
        setCheckingHistory(false);
      }
    };

    checkHistory();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 28, 28),
        }}
      >
        <View
          style={[
            styles.topBar,
            {
              paddingTop: Math.max(topInset + 8, 40),
            },
          ]}
        >
          {!embedded ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={20} color="#475569" />
            </Pressable>
          ) : (
            <View style={styles.headerActionPlaceholder} />
          )}

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Carbon Tracker</Text>
          </View>

          <View style={styles.headerActionPlaceholder} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="eco" size={16} color={ACCENT} />
            <Text style={styles.heroBadgeText}>Daily footprint tracking</Text>
          </View>
          <Text style={styles.heroTitle}>Know what your day really generated</Text>
          <Text style={styles.heroText}>
            This feature helps you measure your carbon footprint from today&apos;s
            real activities, not from a general lifestyle quiz.
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/Screens/DailyCarbonTracker")}
            >
              <Text style={styles.primaryButtonText}>Track CO2</Text>
            </Pressable>

            {checkingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : null}

            {!checkingHistory && hasHistory ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/Screens/CarbonFootprintHistory")}
              >
                <Text style={styles.secondaryButtonText}>View history</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>What you&apos;ll do here</Text>
          {trackerHighlights.map((item) => (
            <View key={item.title} style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <MaterialIcons name={item.icon} size={18} color={ACCENT} />
              </View>
              <View style={styles.highlightContent}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>What gets tracked</Text>
          <View style={styles.listCard}>
            {sections.map((item) => (
              <View key={item} style={styles.listRow}>
                <MaterialIcons name="check-circle" size={18} color={ACCENT} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.noteCard}>
          <MaterialIcons name="info" size={16} color={ACCENT} />
          <Text style={styles.noteText}>
            Each saved day becomes part of your history, so you can see which
            categories are consistently driving your emissions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: ACCENT,
    textAlign: "center",
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: SURFACE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT,
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: TEXT,
  },
  heroText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },
  heroActions: {
    marginTop: 18,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  historyLoading: {
    paddingVertical: 12,
    alignItems: "center",
  },
  sectionBlock: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  highlightCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 10,
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  highlightText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  listCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    fontWeight: "600",
  },
  noteCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
    fontWeight: "600",
  },
});

export default CarbonTrackerLanding;
