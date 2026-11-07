import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { addDays, dateKey, normalizeTime } from '../lib/dates';
import { useStore, useT } from '../lib/store';
import type { Med } from '../lib/types';
import { Button, Card, Field, Screen, Segmented, SubHeader, T, dismiss } from '../ui/kit';
import { space } from '../ui/theme';

export default function MedEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, update } = useStore();
  const t = useT();
  const existing = state.meds.find((m) => m.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [dose, setDose] = useState(existing?.dose ?? '');
  const [times, setTimes] = useState(existing?.times.join(', ') ?? '');
  const [track, setTrack] = useState<'yes' | 'no'>(existing && existing.pillsLeft === null ? 'no' : 'yes');
  const [pills, setPills] = useState(existing?.pillsLeft != null ? String(existing.pillsLeft) : '');
  const [perDose, setPerDose] = useState(String(existing?.pillsPerDose ?? 1));
  const [refill, setRefill] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const parsedTimes = times.split(/[,;\s]+/).filter(Boolean).map(normalizeTime);
  const uniqueTimes = [...new Set(parsedTimes.filter((x): x is string => !!x))].sort();
  const pillCount = Number(pills.replace(',', '.'));
  const perDoseCount = Number(perDose.replace(',', '.'));
  const errors = {
    name: name.trim() ? null : t('errMedName'),
    times: parsedTimes.length && parsedTimes.every(Boolean) ? null : t('errTimes'),
    pills: track === 'no' || (pills.trim() !== '' && pillCount >= 0 && perDoseCount > 0 && Number.isFinite(pillCount) && Number.isFinite(perDoseCount)) ? null : t('errPills'),
  };
  const show = (e: string | null) => (showErrors ? e : null);

  const save = () => {
    if (Object.values(errors).some(Boolean)) { setShowErrors(true); return; }
    const now = Date.now();
    const med: Med = {
      id: existing?.id ?? `med-${now}`,
      name: name.trim(), dose: dose.trim(), times: uniqueTimes,
      pillsLeft: track === 'yes' ? pillCount : null,
      pillsPerDose: track === 'yes' ? perDoseCount : 1,
      startDate: existing?.startDate ?? dateKey(new Date()),
      endDate: existing?.endDate ?? null,
      updatedAt: now,
    };
    update((s) => ({ ...s, meds: existing ? s.meds.map((m) => (m.id === med.id ? med : m)) : [...s.meds, med] }));
    dismiss();
  };

  const addRefill = () => {
    const n = Number(refill);
    if (!existing || !Number.isFinite(n) || n <= 0) return;
    const total = (Number(pills) || 0) + n;
    setPills(String(total));
    setRefill('');
    update((s) => ({ ...s, meds: s.meds.map((m) => (m.id === existing.id ? { ...m, pillsLeft: total, updatedAt: Date.now() } : m)) }));
  };

  const stop = () => {
    if (!confirmStop) { setConfirmStop(true); return; }
    // Yesterday, so today's schedule drops it while past doses stay in the record.
    const end = addDays(dateKey(new Date()), -1);
    update((s) => ({ ...s, meds: s.meds.map((m) => (m.id === existing!.id ? { ...m, endDate: end, updatedAt: Date.now() } : m)) }));
    dismiss();
  };

  return (
    <Screen>
      <SubHeader title={existing ? t('editMed') : t('addMed')} />
      <Field label={t('medName')} value={name} onChangeText={setName} error={show(errors.name)} />
      <Field label={t('medDose')} value={dose} onChangeText={setDose} hint={t('medDoseHint')} />
      <Field label={t('medTimes')} value={times} onChangeText={setTimes} hint={t('medTimesHint')} error={show(errors.times)} keyboardType="numbers-and-punctuation" />
      <View style={{ gap: space.sm }}>
        <T v="label">{t('trackPills')}</T>
        <Segmented value={track} onChange={setTrack} options={[{ value: 'yes', label: t('yes') }, { value: 'no', label: t('no') }]} />
      </View>
      {track === 'yes' && (
        <>
          <Field label={t('pillsLeft')} value={pills} onChangeText={setPills} error={show(errors.pills)} keyboardType="decimal-pad" />
          <Field label={t('pillsPerDose')} value={perDose} onChangeText={setPerDose} keyboardType="decimal-pad" />
        </>
      )}
      <Button kind="primary" label={t('save')} onPress={save} />
      {existing && track === 'yes' && existing.pillsLeft !== null && (
        <Card>
          <Field label={t('refillTitle')} value={refill} onChangeText={setRefill} keyboardType="number-pad" />
          <Button kind="quiet" label={t('refillAdd')} onPress={addRefill} disabled={!(Number(refill) > 0)} />
        </Card>
      )}
      {existing && (
        <View style={{ gap: space.sm }}>
          <T v="caption">{t('stopMedNote')}</T>
          <Button kind={confirmStop ? 'danger' : 'quiet'} label={confirmStop ? `${t('stopMed')}?` : t('stopMed')} onPress={stop} />
        </View>
      )}
    </Screen>
  );
}
