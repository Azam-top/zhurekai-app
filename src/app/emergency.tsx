import { View } from 'react-native';
import { dateKey, formatDate } from '../lib/dates';
import { isActiveOn } from '../lib/logic';
import { useLang, useStore, useT } from '../lib/store';
import { Button, Call103, Screen, SubHeader, T, callNumber } from '../ui/kit';
import { color, space } from '../ui/theme';

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.line }}>
      <T v="caption">{label}</T>
      {children}
    </View>
  );
}

export default function Emergency() {
  const { state } = useStore();
  const t = useT();
  const lang = useLang();
  const p = state.profile!;
  const meds = state.meds.filter((m) => isActiveOn(m, dateKey(new Date())));
  return (
    <Screen>
      <SubHeader title={t('emTitle')} />
      <Call103 />
      <T v="caption">{t('emShow')}</T>
      <Item label={t('emPatient')}><T v="lead">{p.name}</T></Item>
      <Item label={t('emStent')}><T v="lead">{formatDate(p.stentDate, lang)} {p.stentDate.slice(0, 4)}</T></Item>
      <Item label={t('emMeds')}>
        {meds.length ? meds.map((m) => <T key={m.id} v="lead">{m.name} {m.dose}</T>) : <T>{t('emNoMeds')}</T>}
      </Item>
      <Item label={t('emAllergies')}><T v="lead">{p.allergies || t('emNoAllergies')}</T></Item>
      {p.doctorName ? <Item label={t('emDoctor')}><T v="lead">{p.doctorName}</T></Item> : null}
      {p.emergencyPhone ? (
        <Item label={t('emContact')}>
          <T v="lead">{p.emergencyName} {p.emergencyPhone}</T>
          <Button icon="phone" label={t('emCallContact', { name: p.emergencyName || p.emergencyPhone })} onPress={() => callNumber(p.emergencyPhone)} />
        </Item>
      ) : null}
    </Screen>
  );
}
