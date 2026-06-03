// Reusable confirmation/status dialog used across posts, challenges, and other actions.
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const VARIANT_STYLES = {
  confirm: {
    primaryBackground: "#047857",
    primaryText: "#FFFFFF",
  },
  success: {
    primaryBackground: "#047857",
    primaryText: "#FFFFFF",
  },
  info: {
    primaryBackground: "#047857",
    primaryText: "#FFFFFF",
  },
  error: {
    primaryBackground: "#DC2626",
    primaryText: "#FFFFFF",
  },
};

export default function ActionDialog({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  variant = "confirm",
  confirmDisabled = false,
  showCancelButton = true,
}) {
  const palette = VARIANT_STYLES[variant] || VARIANT_STYLES.confirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {showCancelButton ? (
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                showCancelButton ? styles.primaryButton : styles.primaryButtonFull,
                { backgroundColor: palette.primaryBackground },
                confirmDisabled && styles.disabledButton,
              ]}
              onPress={onConfirm}
              disabled={confirmDisabled}
            >
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonFull: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
