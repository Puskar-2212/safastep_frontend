// App entry screen that immediately routes users into the login flow.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/Screens/Login" />;
}

