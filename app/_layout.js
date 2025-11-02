import { Stack } from 'expo-router';

export default function Layout() {
  return (
    
      <Stack>
        
        <Stack.Screen name="Screens/Login" options={{ headerShown: false }} />
        <Stack.Screen name="Screens/SignIn" options={{ headerShown: false }} />
        <Stack.Screen name="Screens/Verification" options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard/Homepage" options={{ headerShown: false }} />

        
        <Stack.Screen name="Screens/config" options={{ headerShown: false }} />
       


      </Stack>
    
  );
}