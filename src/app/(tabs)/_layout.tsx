import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, useT } from '../../lib/store';
import { Icon, type IconName } from '../../ui/Icon';
import { color, font } from '../../ui/theme';

function icon(name: IconName) {
  return function TabIcon({ color: c }: { color: ColorValue }) {
    return <Icon name={name} color={String(c)} size={26} />;
  };
}

export default function TabsLayout() {
  const { state } = useStore();
  const t = useT();
  const insets = useSafeAreaInsets();
  if (!state.profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: color.accent,
      tabBarInactiveTintColor: color.ink2,
      tabBarLabelStyle: { fontFamily: font.medium, fontSize: 13 },
      tabBarStyle: { borderTopColor: color.line, backgroundColor: color.bg, height: 66 + insets.bottom, paddingTop: 6, paddingBottom: 6 + insets.bottom },
      sceneStyle: { backgroundColor: color.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: t('tabToday'), tabBarIcon: icon('today') }} />
      <Tabs.Screen name="meds" options={{ title: t('tabMeds'), tabBarIcon: icon('pill') }} />
      <Tabs.Screen name="health" options={{ title: t('tabHealth'), tabBarIcon: icon('chart') }} />
      <Tabs.Screen name="more" options={{ title: t('tabMore'), tabBarIcon: icon('more') }} />
    </Tabs>
  );
}
