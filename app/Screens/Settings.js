// App settings screen for account navigation and session-level actions.
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Settings = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            router.push("/Screens/Login");
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: "lock",
          label: "Privacy & Security",
          type: "navigate",
          onPress: () => router.push("/Screens/PrivacySecurity"),
          color: "#0C8A4B",
        },
        {
          icon: "person",
          label: "Account Settings",
          type: "navigate",
          onPress: () => Alert.alert("Account Settings", "Coming soon!"),
          color: "#0C8A4B",
        },
        {
          icon: "storage",
          label: "Data & Storage",
          type: "navigate",
          onPress: () => Alert.alert("Data & Storage", "Coming soon!"),
          color: "#0C8A4B",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help",
          label: "Help Center",
          type: "navigate",
          onPress: () => Alert.alert("Help Center", "Visit our help center at help.safastep.com"),
          color: "#0C8A4B",
        },
        {
          icon: "feedback",
          label: "Send Feedback",
          type: "navigate",
          onPress: () => Alert.alert("Feedback", "Thank you for your feedback!"),
          color: "#0C8A4B",
        },
        {
          icon: "bug-report",
          label: "Report a Problem",
          type: "navigate",
          onPress: () => Alert.alert("Report Problem", "Coming soon!"),
          color: "#0C8A4B",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "info",
          label: "About SafaStep",
          type: "navigate",
          onPress: () => Alert.alert("About SafaStep", "SafaStep v1.0.0\n\nMaking the world greener, one step at a time."),
          color: "#0C8A4B",
        },
        {
          icon: "description",
          label: "Terms of Service",
          type: "navigate",
          onPress: () => Alert.alert("Terms of Service", "Coming soon!"),
          color: "#0C8A4B",
        },
        {
          icon: "policy",
          label: "Privacy Policy",
          type: "navigate",
          onPress: () => Alert.alert("Privacy Policy", "Coming soon!"),
          color: "#0C8A4B",
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 10, 50) },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <Pressable
                    style={styles.settingItem}
                    onPress={item.type === "navigate" ? item.onPress : undefined}
                    disabled={item.type === "toggle"}
                  >
                    <View style={styles.settingLeft}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: `${item.color}15` },
                        ]}
                      >
                        <MaterialIcons
                          name={item.icon}
                          size={22}
                          color={item.color}
                        />
                      </View>
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>{item.label}</Text>
                        {item.value && item.type === "navigate" && (
                          <Text style={styles.settingValue}>{item.value}</Text>
                        )}
                      </View>
                    </View>
                    {item.type === "toggle" ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: "#E2E8F0", true: "#C7D2FE" }}
                        thumbColor={item.value ? "#0C8A4B" : "#94A3B8"}
                      />
                    ) : (
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color="#94A3B8"
                      />
                    )}
                  </Pressable>
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.settingDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>SafaStep Version 1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2025 SafaStep. All rights reserved.</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#0C8A4B",
    shadowColor: "#0C8A4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0C8A4B",
    marginBottom: 14,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 74,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#EF4444",
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: "#CBD5E1",
  },
  bottomPadding: {
    height: 40,
  },
});

export default Settings;


