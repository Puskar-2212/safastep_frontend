import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const AnnouncementCard = ({
  announcement,
  onViewLocation,
  isHighlighted = false,
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getPostTypeLabel = (type) => {
    switch (type) {
      case "news":
        return "News Update";
      case "event":
        return "Event";
      case "tip":
        return "Eco Tip";
      case "alert":
        return "Important Alert";
      default:
        return "Announcement";
    }
  };

  const handleViewLocation = () => {
    if (announcement.linkedLocation && onViewLocation) {
      onViewLocation(announcement.linkedLocation);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if description is long (more than 150 characters)
  const isLongDescription =
    announcement.description && announcement.description.length > 150;

  return (
    <View
      style={[styles.container, isHighlighted && styles.highlightedContainer]}
    >
      {/* Pinned Banner */}
      {announcement.isPinned && (
        <View style={styles.pinnedBanner}>
          <MaterialIcons name="push-pin" size={14} color="#0a66c2" />
          <Text style={styles.pinnedBannerText}>Pinned announcement</Text>
        </View>
      )}

      {/* Author Header */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/safastep_logo.png")}
          style={styles.avatar}
          resizeMode="contain"
        />
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>SafaStep Official</Text>
            <MaterialIcons name="verified" size={16} color="#047857" />
          </View>
          <Text style={styles.authorRole}>
            {getPostTypeLabel(announcement.postType)} •{" "}
            {formatDate(announcement.createdAt)}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{announcement.title}</Text>

      {/* Description */}
      <Text
        style={styles.description}
        numberOfLines={isExpanded ? undefined : 3}
      >
        {announcement.description}
      </Text>

      {/* See More / See Less Button */}
      {isLongDescription && (
        <TouchableOpacity style={styles.seeMoreButton} onPress={toggleExpanded}>
          <Text style={styles.seeMoreText}>
            {isExpanded ? "See less" : "See more"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Image if available */}
      {announcement.imageUrl && (
        <Image
          source={{ uri: announcement.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Event Date/Time */}
      {announcement.eventDate && (
        <View style={styles.eventInfo}>
          <Ionicons name="calendar-outline" size={18} color="#047857" />
          <Text style={styles.eventText}>
            {announcement.eventDate}
            {announcement.eventTime && ` • ${announcement.eventTime}`}
          </Text>
        </View>
      )}

      {/* Location Button */}
      {announcement.linkedLocation && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleViewLocation}
        >
          <Ionicons name="location-outline" size={18} color="#047857" />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationName}>
              {announcement.linkedLocation.name}
            </Text>
            <Text style={styles.locationAddress}>
              {announcement.linkedLocation.address}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  highlightedContainer: {
    borderWidth: 2,
    borderColor: "#047857",
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e7f3ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d0e7ff",
  },
  pinnedBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0a66c2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  authorRole: {
    fontSize: 13,
    color: "#6b7280",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    paddingHorizontal: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  seeMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },
  image: {
    width: "100%",
    height: 220,
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  eventText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "600",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  locationAddress: {
    color: "#6b7280",
    fontSize: 12,
  },
});

export default AnnouncementCard;
