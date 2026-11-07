import { router } from 'expo-router';
import { View } from 'react-native';
import { useLang, useStore, useT } from '../../lib/store';
import { Row, Screen, Segmented, T } from '../../ui/kit';
import { space } from '../../ui/theme';

export default function More() {
  const { update } = useStore();
  const t = useT();
  const lang = useLang();
  return (
    <Screen>
      <T v="title" accessibilityRole="header">{t('moreTitle')}</T>
      <View>
        <Row icon="card" label={t('emergencyCard')} onPress={() => router.push('/emergency')} />
        <Row icon="doc" label={t('doctorReport')} onPress={() => router.push('/report')} />
        <Row icon="band" label={t('bracelet')} onPress={() => router.push('/device')} />
        <Row icon="user" label={t('profile')} onPress={() => router.push('/profile')} />
        <Row icon="cloud" label={t('serverSync')} onPress={() => router.push('/server')} />
      </View>
      <View style={{ gap: space.sm }}>
        <T v="label">{t('language')}</T>
        <Segmented value={lang} onChange={(v) => update((s) => ({ ...s, lang: v }))} options={[{ value: 'ru', label: 'Русский' }, { value: 'kk', label: 'Қазақша' }]} />
      </View>
      <T v="caption">{t('aboutNote')}</T>
    </Screen>
  );
}
