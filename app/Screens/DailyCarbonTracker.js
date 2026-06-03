// Daily activity-based carbon tracker for transport, food, energy, and waste inputs.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../constants/config";

const ACCENT = "#0C8A4B";
const BORDER = "#E1E3E4";
const TEXT = "#191C1D";
const MUTED = "#5F6B66";
const SURFACE = "#FFFFFF";
const BG = "#F8F9FA";
const SOFT_ACCENT = "#E8F7F0";
const EARTH_LOGO = require("../../assets/images/earth_logo1.png");
const GRID_CO2_FACTOR = 0.04;

const TRANSPORT_FACTORS = {
  petrol_car: { label: "Petrol", factor: 0.192 },
  diesel_car: { label: "Diesel", factor: 0.171 },
  motorcycle: { label: "Motorcycle", factor: 0.103 },
  bus: { label: "Bus", factor: 0.105 },
  electric_vehicle: { label: "EV", factor: 0.05 },
  bicycle: { label: "Bike", factor: 0 },
  walking: { label: "Walk", factor: 0 },
};
const DEFAULT_TRANSPORT_MODE = null;

const SECTION_CONFIG = [
  {
    key: "transport",
    title: "Transport",
    icon: "directions-car",
    sourceNote: "Enter how far you traveled today.",
    fields: [
      {
        key: "distanceKm",
        label: "Distance today",
        unit: "km",
        factorLabel: "Uses selected mode",
      },
    ],
  },
  {
    key: "food",
    title: "Food",
    icon: "restaurant",
    sourceNote: "Add the food amounts you consumed today using common daily portions.",
    fields: [
      {
        key: "beefGrams",
        label: "Beef",
        unit: "g",
        factor: 0.06,
        factorLabel: "About 6.0 kg CO2 per 100 g",
      },
      {
        key: "chickenGrams",
        label: "Chicken",
        unit: "g",
        factor: 0.006,
        factorLabel: "About 0.6 kg CO2 per 100 g",
      },
      {
        key: "riceGrams",
        label: "Rice",
        unit: "g",
        factor: 0.004,
        factorLabel: "About 0.4 kg CO2 per 100 g",
      },
      {
        key: "vegetablesGrams",
        label: "Vegetables",
        unit: "g",
        factor: 0.0005,
        factorLabel: "About 0.05 kg CO2 per 100 g",
      },
      {
        key: "milkGlasses",
        label: "Milk",
        unit: "glasses",
        factor: 0.75,
        factorLabel: "About 0.75 kg CO2 per glass",
      },
      {
        key: "eggCount",
        label: "Eggs",
        unit: "eggs",
        factor: 0.225,
        factorLabel: "About 0.23 kg CO2 per egg",
      },
    ],
  },
  {
    key: "energy",
    title: "Energy",
    icon: "bolt",
    sourceNote: "Estimate from appliance use or enter your exact electricity use.",
    fields: [],
  },
  {
    key: "waste",
    title: "Waste Generated",
    icon: "delete",
    sourceNote: "Estimate waste from bags and items or enter exact weights.",
    fields: [],
  },
];

const DEFAULT_INPUTS = {
  distanceKm: "",
  beefGrams: "",
  chickenGrams: "",
  riceGrams: "",
  vegetablesGrams: "",
  milkGlasses: "",
  eggCount: "",
  electricityKwh: "",
  fanHours: "",
  acHours: "",
  tvHours: "",
  laptopHours: "",
  washingLoads: "",
  mixedWasteBags: "",
  plasticBottleCount: "",
  snackWrapperCount: "",
  paperSheetCount: "",
  cardboardBags: "",
};

const GLOBAL_AVERAGE_DAILY_CO2 = 12;

const buildResultLevel = (totalCO2) => {
  if (totalCO2 < 7) return { level: "Excellent", color: ACCENT };
  if (totalCO2 < 12) return { level: "Good", color: "#2563EB" };
  if (totalCO2 < 18) return { level: "Average", color: "#D97706" };
  return { level: "High", color: "#DC2626" };
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseAmount = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatCo2 = (value) => Number(value || 0).toFixed(2);
const SECTION_ICONS = {
  transport: "directions-car",
  food: "restaurant",
  energy: "bolt",
  waste: "delete",
};

const ENERGY_APPLIANCE_FIELDS = [
  {
    key: "fanHours",
    label: "Fan used",
    unit: "hours",
    kwhPerUnit: 0.075,
    factorLabel: "Estimated from 0.075 kWh per hour",
  },
  {
    key: "acHours",
    label: "AC/cooler used",
    unit: "hours",
    kwhPerUnit: 1.2,
    factorLabel: "Estimated from 1.2 kWh per hour",
  },
  {
    key: "tvHours",
    label: "TV used",
    unit: "hours",
    kwhPerUnit: 0.1,
    factorLabel: "Estimated from 0.1 kWh per hour",
  },
  {
    key: "laptopHours",
    label: "Laptop/PC used",
    unit: "hours",
    kwhPerUnit: 0.05,
    factorLabel: "Estimated from 0.05 kWh per hour",
  },
  {
    key: "washingLoads",
    label: "Washing machine",
    unit: "loads",
    kwhPerUnit: 0.5,
    factorLabel: "Estimated from 0.5 kWh per load",
  },
];

const ENERGY_EXACT_FIELD = {
  key: "electricityKwh",
  label: "Electricity used",
  unit: "kWh",
  factor: GRID_CO2_FACTOR,
  factorLabel: "Direct electricity entry",
};
const ENERGY_APPLIANCE_KEYS = ENERGY_APPLIANCE_FIELDS.map((field) => field.key);
const WASTE_ESTIMATE_FIELDS = [
  {
    key: "mixedWasteBags",
    label: "Mixed waste bags",
    unit: "bags",
    factor: 0.855,
    factorLabel: "Estimated from about 1.5 kg per bag",
  },
  {
    key: "plasticBottleCount",
    label: "Plastic bottles",
    unit: "items",
    factor: 0.15,
    factorLabel: "Estimated from about 0.025 kg per bottle",
  },
  {
    key: "snackWrapperCount",
    label: "Snack wrappers / packets",
    unit: "items",
    factor: 0.03,
    factorLabel: "Estimated from about 0.005 kg per packet",
  },
  {
    key: "paperSheetCount",
    label: "Paper sheets / notebook pages",
    unit: "sheets",
    factor: 0.0065,
    factorLabel: "Estimated from about 0.005 kg per sheet",
  },
  {
    key: "cardboardBags",
    label: "Paper bags / cardboard pieces",
    unit: "items",
    factor: 0.104,
    factorLabel: "Estimated from about 0.08 kg per item",
  },
];
const WASTE_ESTIMATE_KEYS = WASTE_ESTIMATE_FIELDS.map((field) => field.key);

const getTopCategory = (breakdown) => {
  const positiveEntries = Object.values(breakdown).filter((item) => item.total > 0);
  if (positiveEntries.length === 0) {
    return null;
  }

  return positiveEntries.sort((a, b) => b.total - a.total)[0]?.title || null;
};

const getSectionFields = (section, energyInputMode) => {
  // Transport and food use fixed field lists, while energy and waste swap in specialized input models.
  if (section.key !== "energy") {
    if (section.key !== "waste") {
      return section.fields;
    }

    return WASTE_ESTIMATE_FIELDS;
  }

  if (energyInputMode === "exact") {
    return [ENERGY_EXACT_FIELD];
  }

  return ENERGY_APPLIANCE_FIELDS.map((field) => ({
    ...field,
    factor: parseFloat((field.kwhPerUnit * GRID_CO2_FACTOR).toFixed(6)),
  }));
};

const TRANSPORT_MODE_META = {
  petrol_car: { icon: "directions-car", short: "Petrol" },
  diesel_car: { icon: "local-gas-station", short: "Diesel" },
  motorcycle: { icon: "two-wheeler", short: "Motorcycle" },
  bus: { icon: "directions-bus", short: "Bus" },
  electric_vehicle: { icon: "electric-car", short: "EV" },
  bicycle: { icon: "pedal-bike", short: "Bike" },
  walking: { icon: "directions-walk", short: "Walk" },
};

const DailyCarbonTracker = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const fieldRefs = useRef({});
  const scrollOffsetRef = useRef(0);
  const focusedFieldKeyRef = useRef(null);
  const keyboardHeightRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [activeSection, setActiveSection] = useState("transport");
  const [transportMode, setTransportMode] = useState(DEFAULT_TRANSPORT_MODE);
  const [energyInputMode, setEnergyInputMode] = useState("appliance");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showTransportModeHint, setShowTransportModeHint] = useState(false);

  const hasAnyActivity = useMemo(
    // The save button should only proceed when at least one input meaningfully contributes data.
    () => Object.values(inputs).some((value) => parseAmount(value) !== 0),
    [inputs],
  );

  const calculation = useMemo(() => {
    // Transport is the only category where the user chooses a mode and the factor changes dynamically.
    const selectedTransportFactor = transportMode
      ? TRANSPORT_FACTORS[transportMode].factor
      : 0;
    const breakdown = {};
    const trackerData = {
      transportMode,
      transportFactor: selectedTransportFactor,
      energyInputMode,
    };

    SECTION_CONFIG.forEach((section) => {
      let categoryTotal = 0;
      // Energy switches between appliance estimation and exact kWh, so fields are resolved per section render.
      const sectionFields = getSectionFields(section, energyInputMode);

      sectionFields.forEach((field) => {
        const amount = parseAmount(inputs[field.key]);
        const factor =
          section.key === "transport" ? selectedTransportFactor : field.factor;
        // Each field's footprint is a direct factor-based estimate stored for both UI preview and backend parity.
        const co2Impact = amount * factor;

        categoryTotal += co2Impact;

        trackerData[field.key] = {
          amount,
          unit: field.unit,
          factor,
          co2Impact: parseFloat(co2Impact.toFixed(4)),
        };
      });

      breakdown[section.key] = {
        title: section.title,
        total: parseFloat(categoryTotal.toFixed(4)),
        sourceNote: section.sourceNote,
        percentage: 0,
      };
    });

    // The hero total is the sum of all category totals shown in the current tracker session.
    const totalCO2 = Object.values(breakdown).reduce((sum, item) => sum + item.total, 0);

    Object.keys(breakdown).forEach((key) => {
      breakdown[key].percentage =
        totalCO2 > 0 ? Math.round((breakdown[key].total / totalCO2) * 100) : 0;
    });

    // These summary values mirror the backend result card so the preview stays consistent with the saved version.
    const yearlyTons = parseFloat(((totalCO2 * 365) / 1000).toFixed(2));
    const treesNeeded = totalCO2 > 0 ? Math.ceil((totalCO2 * 365) / 21) : 0;
    const percentage = Math.round(
      ((totalCO2 - GLOBAL_AVERAGE_DAILY_CO2) / GLOBAL_AVERAGE_DAILY_CO2) * 100,
    );
    const topCategory = getTopCategory(breakdown);

    return {
      totalCO2: parseFloat(totalCO2.toFixed(4)),
      yearlyTons,
      treesNeeded,
      impact: buildResultLevel(totalCO2),
      breakdown,
      topCategory,
      trackerData,
      methodologyNote:
        "Estimated with category-specific factors for transport, food, electricity, and waste. Recycled plastic reduces the waste total as an avoided-impact estimate.",
      vsGlobalAverage: {
        percentage,
        betterThan: totalCO2 < GLOBAL_AVERAGE_DAILY_CO2,
      },
    };
  }, [energyInputMode, inputs, transportMode]);

  const activeConfig =
    SECTION_CONFIG.find((section) => section.key === activeSection) || SECTION_CONFIG[0];
  const activeBreakdown = calculation.breakdown[activeSection];
  const activeFields = getSectionFields(activeConfig, energyInputMode);

  const updateInput = (key, value) => {
    // Inputs are sanitized to numeric characters because all tracker calculations expect numeric values only.
    const sanitized = value.replace(/[^0-9.]/g, "");
    setInputs((current) => ({
      ...current,
      [key]: sanitized,
    }));
  };

  const scrollFieldIntoView = (fieldKey) => {
    const fieldRef = fieldRefs.current[fieldKey];
    if (!fieldRef || !scrollRef.current) return;

    // When the keyboard opens on smaller devices, scroll just enough to keep the active field visible.
    fieldRef.measureInWindow((x, y, width, height) => {
      const windowHeight = Dimensions.get("window").height;
      const visibleBottom = windowHeight - Math.max(keyboardHeightRef.current, 0) - 24;
      const fieldBottom = y + height;

      if (fieldBottom <= visibleBottom) return;

      const delta = fieldBottom - visibleBottom + 16;
      scrollRef.current.scrollTo({
        y: Math.max(0, scrollOffsetRef.current + delta),
        animated: true,
      });
    });
  };
 // switch betwwen exact and appliance wise
  const switchEnergyInputMode = (nextMode) => {
    if (nextMode === energyInputMode) return;

    setEnergyInputMode(nextMode);
    setInputs((current) => {
      const nextInputs = { ...current };

      if (nextMode === "exact") {
        // Clear appliance estimates when switching to exact mode so hidden stale values are never double-counted.
        ENERGY_APPLIANCE_KEYS.forEach((key) => {
          nextInputs[key] = "";
        });
      } else {
        // Clear direct kWh when the user goes back to the simpler appliance-based estimate.
        nextInputs.electricityKwh = "";
      }

      return nextInputs;
    });
  };

  const handleInputFocus = (fieldKey) => {
    if (activeConfig.key === "transport" && fieldKey === "distanceKm" && !transportMode) {
      // This hint nudges the user to choose a transport mode before entering a distance value.
      setShowTransportModeHint(true);
    }

    focusedFieldKeyRef.current = fieldKey;
    setTimeout(() => {
      scrollFieldIntoView(fieldKey);
    }, 120);
  };

  React.useEffect(() => {
    // Keyboard listeners keep the compact mobile form usable by automatically revealing the focused field.
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardHeightRef.current = event.endCoordinates?.height || 0;
      setKeyboardHeight(keyboardHeightRef.current);
      if (focusedFieldKeyRef.current) {
        setTimeout(() => {
          scrollFieldIntoView(focusedFieldKeyRef.current);
        }, 60);
      }
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      focusedFieldKeyRef.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const saveDailyTracker = async () => {
    if (!hasAnyActivity) {
      Alert.alert(
        "No activity entered",
        "Enter at least one activity amount so we can calculate your footprint.",
      );
      return;
    }

    try {
      setSaving(true);
      const storedEmail = await AsyncStorage.getItem("email");
      const storedMobile = await AsyncStorage.getItem("mobile");
      const identifier = storedEmail || storedMobile;

      if (!identifier) {
        Alert.alert("Not signed in", "Please sign in again to save your daily tracker.");
        return;
      }

      // The payload sends normalized numeric inputs so the backend can recompute an authoritative result.
      const payload = {
        mobile: identifier,
        activityDate: getTodayDate(),
        transportMode: transportMode || "walking",
        energyInputMode,
        inputs: Object.fromEntries(
          Object.entries(inputs).map(([key, value]) => [key, parseAmount(value)]),
        ),
      };

      const response = await fetch(`${BASE_URL}/carbon-footprint/daily/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.detail || "Failed to save daily tracker");
      }

      const serverResult = result.result;
      // The saved result screen is hydrated from the backend response so the user sees the authoritative stored values.
      setSavedResult({
        totalCO2: serverResult.totalCO2,
        yearlyTons: serverResult.yearlyTons,
        treesNeeded: serverResult.treesNeeded,
        impact: buildResultLevel(serverResult.totalCO2),
        breakdown: serverResult.breakdown,
        topCategory: serverResult.trackerData?.topCategory || serverResult.topCategory,
        trackerData: serverResult.trackerData,
        methodologyNote: serverResult.trackerData?.methodologyNote || calculation.methodologyNote,
        vsGlobalAverage: serverResult.vsGlobalAverage,
        activityDate: serverResult.activityDate,
      });
    } catch (error) {
      console.error("Error saving daily tracker:", error);
      Alert.alert(
        "Save failed",
        error.message || "We could not save your carbon tracker for today. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 44) }]}>
      <Pressable
        style={styles.backButton}
        onPress={() => (savedResult ? setSavedResult(null) : router.back())}
      >
        <MaterialIcons name="arrow-back" size={20} color="#475569" />
      </Pressable>
      <Text style={styles.headerTitle}>Daily Carbon</Text>
      <View style={styles.headerGhost} />
    </View>
  );

  const renderHeroCard = (result) => (
    <View style={styles.heroCard}>
      <View style={styles.heroContent}>
        <Text style={styles.heroLabel}>Today&apos;s total</Text>
        <Text style={styles.heroValue}>{formatCo2(result.totalCO2)}</Text>
        <Text style={styles.heroUnit}>kg CO2</Text>

        <View style={styles.heroStatusPill}>
          <MaterialIcons name="eco" size={14} color={result.impact.color} />
          <Text style={[styles.heroStatusText, { color: result.impact.color }]}>
            {result.impact.level}
          </Text>
        </View>
      </View>

      <View style={styles.heroArtworkWrap}>
        <Image source={EARTH_LOGO} style={styles.heroArtwork} resizeMode="contain" />
      </View>
    </View>
  );

  if (saving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Calculating...</Text>
      </View>
    );
  }

  if (savedResult) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
        >
          {renderHeader()}

          {renderHeroCard(savedResult)}

          <View style={styles.resultHighlightCard}>
            <Text style={styles.resultHighlightText}>
              {savedResult.topCategory
                ? `${savedResult.topCategory} contributed the most today.`
                : "No category exceeded zero today."}
            </Text>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={styles.resultStatChip}>
              <Text style={styles.resultStatValue}>{savedResult.yearlyTons}</Text>
              <Text style={styles.resultStatLabel}>tons/year</Text>
            </View>
            <View style={styles.resultStatChip}>
              <Text style={styles.resultStatValue}>{savedResult.treesNeeded}</Text>
              <Text style={styles.resultStatLabel}>trees</Text>
            </View>
          </View>

          <Text style={styles.resultMethodText}>{savedResult.methodologyNote}</Text>

          <View style={styles.resultActionsRow}>
            <Pressable style={styles.resultSecondaryButton} onPress={() => setSavedResult(null)}>
              <Text style={styles.resultSecondaryButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.resultPrimaryButton}
              onPress={() => router.push("/Screens/CarbonFootprintHistory")}
            >
              <Text style={styles.resultPrimaryButtonText}>History</Text>
            </Pressable>
            <Pressable
              style={styles.resultGhostButton}
              onPress={() => router.replace("/Screens/CarbonTrackerLanding")}
            >
              <Text style={styles.resultGhostButtonText}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {renderHeader()}

        {renderHeroCard(calculation)}

        <View style={styles.summaryNoteCard}>
          <Text style={styles.summaryHint}>
            {hasAnyActivity
              ? `${calculation.topCategory || "No category"} is currently the top contributor.`
              : "Enter values below to calculate your footprint."}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {SECTION_CONFIG.map((section) => {
            const active = section.key === activeSection;
            return (
              <Pressable
                key={section.key}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setActiveSection(section.key)}
              >
                <MaterialIcons
                  name={SECTION_ICONS[section.key] || section.icon}
                  size={14}
                  color={active ? "#FFFFFF" : MUTED}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {section.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.editorCard}>
          {activeConfig.key === "transport" && (
            <View style={styles.modeRow}>
              <Text style={styles.modeLabel}>Mode</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.modeChips}>
                  {Object.entries(TRANSPORT_FACTORS).map(([key, config]) => {
                    const selected = transportMode === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.modeChip, selected && styles.modeChipActive]}
                        onPress={() => {
                          setTransportMode(key);
                          setShowTransportModeHint(false);
                        }}
                      >
                        <View style={styles.modeIconWrap}>
                          <MaterialIcons
                            name={TRANSPORT_MODE_META[key]?.icon || "directions-car"}
                            size={18}
                            color={selected ? ACCENT : "#64748B"}
                          />
                          {selected ? (
                            <View style={styles.modeCheckBadge}>
                              <MaterialIcons name="check" size={10} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.modeChipText, selected && styles.modeChipTextActive]}>
                          {TRANSPORT_MODE_META[key]?.short || config.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {activeConfig.key === "energy" && (
            <View style={styles.energyToggleRow}>
              <Pressable
                style={[
                  styles.energyToggleChip,
                  energyInputMode === "appliance" && styles.energyToggleChipActive,
                ]}
                onPress={() => switchEnergyInputMode("appliance")}
              >
                <Text
                  style={[
                    styles.energyToggleText,
                    energyInputMode === "appliance" && styles.energyToggleTextActive,
                  ]}
                >
                  Appliance estimate
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.energyToggleChip,
                  energyInputMode === "exact" && styles.energyToggleChipActive,
                ]}
                onPress={() => switchEnergyInputMode("exact")}
              >
                <Text
                  style={[
                    styles.energyToggleText,
                    energyInputMode === "exact" && styles.energyToggleTextActive,
                  ]}
                >
                  Enter exact kWh instead
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.fieldsList}>
            {activeFields.map((field) => {
              const entry = calculation.trackerData[field.key];
              return (
                <View
                  key={field.key}
                  ref={(ref) => {
                    fieldRefs.current[field.key] = ref;
                  }}
                  style={styles.fieldRow}
                  collapsable={false}
                >
                  <View style={styles.fieldTop}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Text style={styles.fieldImpact}>
                      {entry ? `${formatCo2(entry.co2Impact)} kg CO2` : "0.00 kg CO2"}
                    </Text>
                  </View>

                  <View style={styles.fieldInputRow}>
                    <View style={styles.inputShell}>
                      <MaterialIcons
                        name={activeConfig.key === "transport" ? "place" : activeConfig.icon}
                        size={16}
                        color="#9CA3AF"
                        style={styles.inputLeadingIcon}
                      />
                      <TextInput
                        value={inputs[field.key]}
                        onChangeText={(value) => updateInput(field.key, value)}
                        onFocus={() => {
                          handleInputFocus(field.key);
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.unitBadge}>
                      <Text style={styles.unitBadgeText}>{field.unit}</Text>
                    </View>
                  </View>

                  <Text style={styles.fieldMeta}>
                    {field.factorLabel || `${field.factor} kg CO2 per ${field.unit}`}
                  </Text>
                  {activeConfig.key === "transport" &&
                  field.key === "distanceKm" &&
                  showTransportModeHint &&
                  !transportMode ? (
                    <Text style={styles.fieldHint}>Please select a mode first.</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.saveButton} onPress={saveDailyTracker}>
          <Text style={styles.saveButtonText}>Calculate and save today</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT,
  },
  headerGhost: {
    width: 40,
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#DDE7F3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT,
  },
  heroValue: {
    marginTop: 4,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.8,
  },
  heroUnit: {
    marginTop: 0,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  heroStatusPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SOFT_ACCENT,
  },
  heroStatusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroArtworkWrap: {
    width: 108,
    height: 108,
    marginRight: 0,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  heroArtwork: {
    width: "100%",
    height: "100%",
    opacity: 0.95,
  },
  summaryNoteCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryMain: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: ACCENT,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: TEXT,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  summaryHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  resultHighlightCard: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#E7EEF6",
  },
  resultHighlightText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#52606D",
    fontWeight: "600",
  },
  resultStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
  },
  resultStatChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECF2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
  },
  resultStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
  },
  resultMethodText: {
    marginHorizontal: 20,
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
  },
  metricChip: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
  },
  tabsRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#E6ECF3",
    shadowColor: "#DDE7F3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 2,
  },
  tabChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  editorCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#DDE7F3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 5,
  },
  modeRow: {
    marginTop: 0,
  },
  energyToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  energyToggleChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFFFFF",
  },
  energyToggleChipActive: {
    borderColor: ACCENT,
    backgroundColor: "#F0FDF4",
  },
  energyToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  energyToggleTextActive: {
    color: ACCENT,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  modeChips: {
    flexDirection: "row",
    gap: 6,
  },
  modeChip: {
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6ECF3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  modeChipActive: {
    backgroundColor: "#F5FFFA",
    borderColor: "#6DD3A4",
  },
  modeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 5,
  },
  modeCheckBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  modeChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  modeChipTextActive: {
    color: ACCENT,
  },
  fieldsList: {
    marginTop: 14,
  },
  fieldRow: {
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  fieldTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  fieldImpact: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT,
  },
  fieldInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 10,
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  unitBadge: {
    minWidth: 60,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  fieldMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#94A3B8",
  },
  fieldHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: "#DC2626",
    fontWeight: "600",
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: ACCENT,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
  },
  resultActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
  },
  resultPrimaryButton: {
    flex: 1.05,
    backgroundColor: ACCENT,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  resultPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  resultSecondaryButton: {
    flex: 0.85,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  resultSecondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  resultGhostButton: {
    flex: 0.75,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5EAF0",
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  resultGhostButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800",
  },
  doneButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default DailyCarbonTracker;
