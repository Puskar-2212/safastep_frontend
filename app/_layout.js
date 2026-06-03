// Root Expo Router stack definition for the mobile application.
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Screens/Login" />
        <Stack.Screen name="Screens/SignIn" />
        <Stack.Screen name="Screens/Verification" />
        <Stack.Screen name="Screens/ProfileSetup" />
        <Stack.Screen name="Dashboard/Homepage" />
        <Stack.Screen name="Screens/Settings" />
        <Stack.Screen name="Screens/PrivacySecurity" />
        <Stack.Screen name="Screens/UserProfile" />
        <Stack.Screen name="Screens/CarbonTrackerLanding" />
        <Stack.Screen name="Screens/CarbonFootprintHistory" />
        <Stack.Screen name="Screens/DailyCarbonTracker" />
        <Stack.Screen name="Screens/Leaderboard" />
        <Stack.Screen name="Screens/Notifications" />
        <Stack.Screen name="Screens/PostDetail" />
        <Stack.Screen name="Screens/Challenges" />
        <Stack.Screen name="Screens/ChallengeDetail" />
        <Stack.Screen name="config" />
      </Stack>
    </SafeAreaProvider>
  );
}
