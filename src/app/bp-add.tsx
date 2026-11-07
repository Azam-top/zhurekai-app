import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isPlausibleBp } from '../lib/logic';
import { useStore, useT } from '../lib/store';
import { Button, Field, Screen, SubHeader, T, dismiss } from '../ui/kit';
import { color, space } from '../ui/theme';

export default function BpAdd() {
  const { update } = useStore();
  const t = useT();
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [error, setError] = useState(false);

  const save = () => {
    const systolic = Number(sys), diastolic = Number(dia), p = Number(pulse);
    const pulseOk = !pulse.trim() || (Number.isInteger(p) && p >= 25 && p <= 250);
    if (!isPlausibleBp(systolic, diastolic) || !pulseOk) { setError(true); return; }
    const now = Date.now();
    update((s) => ({ ...s, bp: [...s.bp, { id: `bp-${now}`, at: now, systolic, diastolic, pulse: pulse.trim() ? p : null, updatedAt: now }] }));
    dismiss();
  };

  return (
    <Screen>
      <SubHeader title={t('bpAdd')} />
      <View style={styles.row}>
        <View style={styles.cell}><Field label={t('bpSystolic')} value={sys} onChangeText={setSys} keyboardType="number-pad" /></View>
        <View style={styles.cell}><Field label={t('bpDiastolic')} value={dia} onChangeText={setDia} keyboardType="number-pad" /></View>
      </View>
      <Field label={`${t('bpPulse')} (${t('optional')})`} value={pulse} onChangeText={setPulse} keyboardType="number-pad" />
      {error && <T v="caption" style={{ color: color.danger }}>{t('errBp')}</T>}
      <Button kind="primary" label={t('save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: space.md }, cell: { flex: 1 } });
