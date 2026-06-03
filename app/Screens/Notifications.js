// In-app notification center for post, challenge, and moderation updates.
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../config";

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userIdentifier, setUserIdentifier] = useState(null);

  useEffect(() => {
    getUserIdentifier();
  }, []);

  useEffect(() => {
    if (userIdentifier) {
      fetchNotifications();
    }
  }, [userIdentifier]);

  const getUserIdentifier = async () => {
    try {
      const mobile = await AsyncStorage.getItem("mobile");
      const email = await AsyncStorage.getItem("email");
      setUserIdentifier(mobile || email);
    } catch (error) {
      console.error("Error getting user identifier:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/notifications/${userIdentifier}`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [userIdentifier]);

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${BASE_URL}/notifications/${userIdentifier}/read-all`, {
        method: "PUT",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true })),
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    // All notifications use the same bell icon with neutral color
    return { name: "notifications-outline", color: "#0C8A4B" };
  };

  const formatTime = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderNotification = ({ item }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => {
          if (!item.read) {
            markAsRead(item._id);
          }

          // Navigate based on notification type
          if (
            item.type === "announcement" &&
            item.data &&
            item.data.announcementId
          ) {
            // For announcements, go to dedicated announcement detail page
            router.push(
              `/Screens/AnnouncementDetail?announcementId=${item.data.announcementId}`,
            );
          } else if (
            item.type === "new_eco_location" &&
            item.data &&
            item.data.locationId
          ) {
            // For new eco-location notifications, navigate to Homepage with explore tab and location
            router.push(
              `/Dashboard/Homepage?tab=explore&locationId=${item.data.locationId}&latitude=${item.data.latitude}&longitude=${item.data.longitude}`,
            );
          } else if (
            item.data &&
            item.data.postId &&
            item.type !== "post_deleted"
          ) {
            // For post-related notifications (except deleted posts)
            router.push(`/Screens/PostDetail?postId=${item.data.postId}`);
          }
        }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            {item.title.trim()}
          </Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0C8A4B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 12, 50) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.some((n) => !n.read) && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.headerButtonText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You&apos;ll see notifications here when something happens
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom + 12, 12) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0C8A4B"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0C8A4B",
    shadowColor: "#0C8A4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    paddingTop: 50,
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
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  headerButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  unreadCard: {
    backgroundColor: "#F3FBF8",
    borderColor: "#BFE7D1",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
    lineHeight: 19,
  },
  time: {
    fontSize: 12,
    color: "#94A3B8",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0C8A4B",
    marginLeft: 8,
    alignSelf: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});
