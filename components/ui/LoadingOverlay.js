// Shared full-screen loading overlay used during long-running frontend actions.
import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

export default function LoadingOverlay({ visible, title, message }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
  },
});
