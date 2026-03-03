import { Stack } from "expo-router";

export default function Layout() {
  return (
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
      <Stack.Screen name="Screens/CarbonFootprintHistory" />
      <Stack.Screen name="Screens/CO2CalculatorLanding" />
      <Stack.Screen name="Screens/CO2Calculator" />
      <Stack.Screen name="Screens/Leaderboard" />
      <Stack.Screen name="Screens/Notifications" />
      <Stack.Screen name="Screens/PostDetail" />
      <Stack.Screen name="Screens/Challenges" />
      <Stack.Screen name="Screens/ChallengeDetail" />
      <Stack.Screen name="config" />
    </Stack>
  );
}
