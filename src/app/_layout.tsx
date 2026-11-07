import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, useFonts } from '@expo-google-fonts/onest';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BandProvider } from '../band/BandProvider';
import { StoreProvider, useStore } from '../lib/store';
import { color } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready } = useStore();
  const [fonts] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold });
  const loaded = ready && fonts;
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <BandProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </BandProvider>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
