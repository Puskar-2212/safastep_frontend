// Wrapper screen for viewing another user's public profile by identifier.
import { useLocalSearchParams } from "expo-router";
import React from "react";
import Profile from "./Profile";

const UserProfile = () => {
  const params = useLocalSearchParams();
  const viewingUserId = Array.isArray(params.mobile)
    ? params.mobile[0]
    : params.mobile;

  return <Profile viewingUserId={viewingUserId || null} />;
};

export default UserProfile;
