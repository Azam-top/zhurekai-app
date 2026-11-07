import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { dateKey } from '../../lib/dates';
import { isActiveOn, supplyDaysLeft, LOW_SUPPLY_DAYS } from '../../lib/logic';
import { remindersAllowed } from '../../lib/reminders';
import { useStore, useT } from '../../lib/store';
import { Banner, Button, Card, Screen, T } from '../../ui/kit';
import { color, font } from '../../ui/theme';

export default function Meds() {
  const { state } = useStore();
  const t = useT();
  const [allowed, setAllowed] = useState(true);
  const meds = state.meds.filter((m) => isActiveOn(m, dateKey(new Date())) || m.startDate > dateKey(new Date()));

  useEffect(() => { if (meds.length) remindersAllowed().then(setAllowed).catch(() => {}); }, [meds.length]);

  return (
    <Screen>
      <T v="title" accessibilityRole="header">{t('medsTitle')}</T>
      {!allowed && <Banner text={t('remindersOff')} />}
      {meds.length === 0 && <T>{t('noMeds')}</T>}
      {meds.map((m) => {
        const days = supplyDaysLeft(m);
        const low = days !== null && days <= LOW_SUPPLY_DAYS;
        return (
          <Card key={m.id}>
            <View>
              <T v="lead">{m.name}</T>
              <T>{m.dose}</T>
            </View>
            <T>{m.times.join(', ')}</T>
            <T style={low ? { color: color.warn, fontFamily: font.semibold } : undefined} v={low ? 'body' : 'caption'}>
              {days === null ? t('pillsUntracked') : t('pillsLeftValue', { pills: m.pillsLeft!, days })}
            </T>
            <Button kind="quiet" label={t('editMed')} onPress={() => router.push({ pathname: '/med-edit', params: { id: m.id } })} />
          </Card>
        );
      })}
      <Button icon="plus" label={t('addMed')} onPress={() => router.push('/med-edit')} />
    </Screen>
  );
}
