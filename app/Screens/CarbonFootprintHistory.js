// History and statistics screen for previously saved daily carbon tracker entries.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Animatable from "react-native-animatable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../constants/config";

const ACCENT = "#0C8A4B";
const ACCENT_DARK = "#012D1D";
const ACCENT_SOFT = "#CEE9D3";
const BG = "#F8F9FA";
const SURFACE = "#FFFFFF";
const TEXT = "#191C1D";
const MUTED = "#5F6B66";
const BORDER = "#E1E3E4";
const SHADOW = {
  shadowColor: "#1B4332",
  shadowOpacity: 0.08,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
const API_JSON_HEADERS = {
  "ngrok-skip-browser-warning": "true",
};
const EARTH_LOGO = require("../../assets/images/earth_logo1.png");
const TRACKED_CATEGORY_KEYS = ["transport", "food", "energy", "waste"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "transport", label: "Travel" },
  { key: "food", label: "Food" },
  { key: "energy", label: "Energy" },
  { key: "waste", label: "Waste" },
];

const CATEGORY_META = {
  transport: {
    label: "Transport",
    title: "Transport footprint",
    icon: "directions-car",
    bg: "#D8F0DE",
    color: "#1F6B40",
  },
  food: {
    label: "Food",
    title: "Food footprint",
    icon: "restaurant",
    bg: "#E2F1D8",
    color: "#48622E",
  },
  energy: {
    label: "Energy",
    title: "Energy",
    icon: "home",
    bg: "#E8E7FB",
    color: "#4A4D9B",
  },
  waste: {
    label: "Waste Generated",
    title: "Waste generated",
    icon: "delete",
    bg: "#FDECCF",
    color: "#9A6700",
  },
};

const parseDateKey = (dateKey) => {
  if (!dateKey || typeof dateKey !== "string") {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatDateLine = (dateKey, timestamp) => {
  const date = parseDateKey(dateKey) || new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLine = (timestamp) =>
  new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatCo2 = (value) => Number(value || 0).toFixed(2);
const getTrackedTotal = (item, selectedFilter = "all") => {
  const breakdown = item?.breakdown || {};

  if (selectedFilter !== "all") {
    // Filtered totals only show the selected category's contribution for each saved entry.
    return Number(breakdown[selectedFilter]?.total || 0);
  }

  // The "all" filter sums only the tracker categories that still exist in the current product scope.
  return TRACKED_CATEGORY_KEYS.reduce(
    (sum, key) => sum + Number(breakdown[key]?.total || 0),
    0,
  );
};

const CarbonFootprintHistory = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [summaryMode, setSummaryMode] = useState("monthly");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const sourceType = "daily_checkin";

  const loadHistory = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      const mobile = await AsyncStorage.getItem("mobile");
      const identifier = email || mobile;

      if (!identifier) {
        setHistory([]);
        return;
      }

      // History is limited to daily_checkin records so old or unrelated carbon sources are excluded.
      const response = await fetch(
        `${BASE_URL}/carbon-footprint/history/${identifier}?limit=0&sourceType=${sourceType}`,
        { headers: API_JSON_HEADERS },
      );
      const rawText = await response.text();
      const result = rawText ? JSON.parse(rawText) : {};

      if (response.ok && result.success) {
        setHistory(result.results || []);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setHistory([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      const mobile = await AsyncStorage.getItem("mobile");
      const identifier = email || mobile;

      if (!identifier) {
        setStats(null);
        return;
      }

      // Stats come from a separate endpoint because aggregates are calculated differently from the raw history list.
      const response = await fetch(
        `${BASE_URL}/carbon-footprint/stats/${identifier}?sourceType=${sourceType}`,
        { headers: API_JSON_HEADERS },
      );
      const rawText = await response.text();
      const result = rawText ? JSON.parse(rawText) : {};

      if (response.ok && result.success && result.hasData) {
        setStats(result.stats);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats(null);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadHistory(), loadStats()]);
      setLoading(false);
    };

    load();
  }, [loadHistory, loadStats]);

  const dayChange = Number.isFinite(Number(stats?.dayChange)) ? Number(stats.dayChange) : 0;
  const isImproving = dayChange <= 0;
  const dayChangeAbs = Math.abs(dayChange).toFixed(1);

  const activityItems = useMemo(() => {
    // Expand each saved day into category-level activity cards so filters can work across all history entries.
    const items = history.flatMap((item) => {
      const breakdown = item.breakdown || {};

      return Object.keys(CATEGORY_META)
        .map((key) => {
          const value = Number(breakdown[key]?.total || 0);
          if (value <= 0) {
            return null;
          }

          return {
            id: `${item._id || item.timestamp}-${key}`,
            key,
            value,
            dateKey: item.date,
            dateLabel: formatDateLine(item.date, item.timestamp),
            timeLabel: formatTimeLine(item.timestamp),
            timestamp: item.timestamp,
            ...CATEGORY_META[key],
          };
        })
        .filter(Boolean);
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const latestTimestamp = history[0]?.timestamp ?? null;
  const latestDateKey = history[0]?.date ?? null;

  const scopedItems = useMemo(() => {
    if (!latestTimestamp) {
      return [];
    }

    const scopedLatestDate = parseDateKey(latestDateKey) || new Date(latestTimestamp * 1000);

    return activityItems.filter((item) => {
      if (summaryMode === "all_time") {
        return true;
      }

      if (summaryMode === "daily") {
        return item.dateKey === latestDateKey;
      }

      const itemDate = parseDateKey(item.dateKey) || new Date(item.timestamp * 1000);
      return (
        itemDate.getMonth() === scopedLatestDate.getMonth() &&
        itemDate.getFullYear() === scopedLatestDate.getFullYear()
      );
    });
  }, [activityItems, latestDateKey, latestTimestamp, summaryMode]);

  const visibleItems = useMemo(() => {
    if (selectedFilter === "all") {
      return scopedItems;
    }
    return scopedItems.filter((item) => item.key === selectedFilter);
  }, [scopedItems, selectedFilter]);

  const summaryTotal = useMemo(() => {
    if (!latestTimestamp) {
      return 0;
    }

    return history.reduce((sum, item) => {
      if (summaryMode === "daily") {
        if (item.date !== latestDateKey) {
          return sum;
        }
      } else if (summaryMode === "monthly") {
        const latestDate = parseDateKey(latestDateKey) || new Date(latestTimestamp * 1000);
        const targetMonth = latestDate.getMonth();
        const targetYear = latestDate.getFullYear();
        const itemDate = parseDateKey(item.date) || new Date(item.timestamp * 1000);

        if (
          itemDate.getMonth() !== targetMonth ||
          itemDate.getFullYear() !== targetYear
        ) {
          return sum;
        }
      }

      return sum + getTrackedTotal(item, selectedFilter);
    }, 0);
  }, [history, latestDateKey, latestTimestamp, selectedFilter, summaryMode]);

  const filterLabel =
    FILTERS.find((item) => item.key === selectedFilter)?.label.toUpperCase() || "ALL";

  const summaryLabel =
    summaryMode === "all_time"
      ? selectedFilter === "all"
        ? "ALL TIME FOOTPRINT"
        : `${filterLabel} ALL TIME`
      : summaryMode === "daily"
      ? selectedFilter === "all"
        ? "LATEST DAY TOTAL"
        : `${filterLabel} FOR LATEST DAY`
      : selectedFilter === "all"
        ? "MONTHLY FOOTPRINT"
        : `${filterLabel} THIS MONTH`;

  const recentSectionLabel =
    summaryMode === "all_time"
      ? selectedFilter === "all"
        ? "ALL ACTIVITIES"
        : `${FILTERS.find((item) => item.key === selectedFilter)?.label.toUpperCase()} ALL TIME`
      : summaryMode === "daily"
      ? selectedFilter === "all"
        ? "LATEST DAY ACTIVITIES"
        : `${FILTERS.find((item) => item.key === selectedFilter)?.label.toUpperCase()} FOR LATEST DAY`
      : selectedFilter === "all"
        ? "MONTH ACTIVITIES"
        : `${FILTERS.find((item) => item.key === selectedFilter)?.label.toUpperCase()} THIS MONTH`;

  const summaryChangeText =
    summaryMode === "all_time"
      ? `${dayChangeAbs}% ${isImproving ? "lower" : "higher"} than previous saved day`
      : summaryMode === "daily"
      ? `${dayChangeAbs}% ${isImproving ? "lower" : "higher"} than previous saved day`
      : `${dayChangeAbs}% ${isImproving ? "lower" : "higher"} than last saved day`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(topInset + 8, 40) }]}>
        <View style={styles.topBarLeft}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color={ACCENT_DARK} />
          </Pressable>
          <View>
            <Text style={styles.title}>Daily History</Text>
            <Text style={styles.subtitle}>Your carbon journey so far</Text>
          </View>
        </View>
      </View>

        <View style={styles.emptyState}>
          <Image source={EARTH_LOGO} style={styles.emptyArtwork} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyText}>
            Save your first daily check-in to start seeing your activity history here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(topInset + 8, 40) }]}>
        <View style={styles.topBarLeft}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color={ACCENT_DARK} />
          </Pressable>
          <View>
            <Text style={styles.title}>Daily History</Text>
            <Text style={styles.subtitle}>Your carbon journey so far</Text>
          </View>
        </View>

        <Pressable
          style={[styles.filterIconButton, filterMenuOpen && styles.filterIconButtonActive]}
          onPress={() => setFilterMenuOpen((current) => !current)}
        >
          <MaterialIcons name="tune" size={18} color={ACCENT_DARK} />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={filterMenuOpen}
        onRequestClose={() => setFilterMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setFilterMenuOpen(false)} />
          <View style={[styles.menuCard, { top: Math.max(topInset + 74, 88) }]}>
            <Text style={styles.menuTitle}>Summary view</Text>
            {[
              { key: "all_time", label: "All time total" },
              { key: "monthly", label: "Monthly total" },
              { key: "daily", label: "Latest day total" },
            ].map((option) => {
              const active = summaryMode === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setSummaryMode(option.key);
                    setFilterMenuOpen(false);
                  }}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                >
                  <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                    {option.label}
                  </Text>
                  {active ? <MaterialIcons name="check" size={16} color={ACCENT_DARK} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 24) },
        ]}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{summaryLabel}</Text>
          <View style={styles.summaryValueRow}>
            <Text style={styles.summaryValue}>{formatCo2(summaryTotal)}</Text>
            <Text style={styles.summaryUnit}>kg CO2</Text>
          </View>

          <View style={styles.changePill}>
            <MaterialIcons
              name={isImproving ? "trending-down" : "trending-up"}
              size={16}
              color={ACCENT_DARK}
            />
            <Text style={styles.changePillText}>{summaryChangeText}</Text>
          </View>
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{recentSectionLabel}</Text>

        <View style={styles.listWrap}>
          {visibleItems.map((item) => (
            <Animatable.View key={item.id} animation="fadeInUp" duration={350} style={styles.activityCard}>
              <View style={styles.activityLeft}>
                <View style={[styles.activityIconWrap, { backgroundColor: item.bg }]}>
                  <MaterialIcons name={item.icon} size={20} color={item.color} />
                </View>

                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityMeta}>
                    {item.dateLabel}, {item.timeLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.activityRight}>
                <View style={styles.valueWrap}>
                  <Text style={styles.activityValue}>{formatCo2(item.value)}</Text>
                  <Text style={styles.activityUnit}>kg CO2</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#B8C0BA" />
              </View>
            </Animatable.View>
          ))}

          {visibleItems.length === 0 ? (
            <View style={styles.noItemsCard}>
              <Text style={styles.noItemsText}>No saved activities in this category yet.</Text>
            </View>
          ) : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
    color: MUTED,
  },
  topBar: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 21,
    fontWeight: "600",
    color: ACCENT_DARK,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  filterIconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    marginTop: 2,
  },
  filterIconButtonActive: {
    backgroundColor: "#F2F5F3",
  },
  menuOverlay: {
    flex: 1,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  menuCard: {
    position: "absolute",
    right: 16,
    width: 176,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EDF0EE",
    ...SHADOW,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  menuItem: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemActive: {
    backgroundColor: ACCENT_SOFT,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT,
  },
  menuItemTextActive: {
    color: ACCENT_DARK,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDF0EE",
    overflow: "hidden",
    ...SHADOW,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 1,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 46,
    lineHeight: 48,
    fontWeight: "700",
    color: ACCENT_DARK,
    letterSpacing: -1.4,
  },
  summaryUnit: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "400",
    color: TEXT,
    paddingBottom: 6,
  },
  changePill: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F5F4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changePillText: {
    fontSize: 13,
    fontWeight: "500",
    color: ACCENT_DARK,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ACCENT_SOFT,
  },
  filterChipActive: {
    backgroundColor: ACCENT_DARK,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#506856",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: MUTED,
    marginBottom: 12,
  },
  listWrap: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EDF0EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW,
  },
  activityLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activityCopy: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT,
  },
  activityMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: ACCENT_DARK,
  },
  activityRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueWrap: {
    alignItems: "flex-end",
  },
  activityValue: {
    fontSize: 16,
    fontWeight: "700",
    color: ACCENT_DARK,
    letterSpacing: -0.3,
  },
  activityUnit: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: MUTED,
  },
  noItemsCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EDF0EE",
    ...SHADOW,
  },
  noItemsText: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 64,
  },
  emptyArtwork: {
    width: 160,
    height: 160,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },
});

export default CarbonFootprintHistory;
