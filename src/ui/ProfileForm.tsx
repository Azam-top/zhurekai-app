import { useState } from 'react';
import { View } from 'react-native';
import { dateKey, isValidDateKey } from '../lib/dates';
import { useT } from '../lib/store';
import type { Profile } from '../lib/types';
import { Button, Field } from './kit';
import { space } from './theme';

/** Shared by onboarding and the profile screen. */
export function ProfileForm({ initial, submitLabel, onSubmit }: { initial: Profile | null; submitLabel: string; onSubmit: (p: Profile) => void }) {
  const t = useT();
  const today = dateKey(new Date());
  const [name, setName] = useState(initial?.name ?? '');
  const [stentDate, setStentDate] = useState(initial?.stentDate ?? today);
  const [stepGoal, setStepGoal] = useState(String(initial?.stepGoal ?? ''));
  const [emergencyName, setEmergencyName] = useState(initial?.emergencyName ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(initial?.emergencyPhone ?? '');
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? '');
  const [allergies, setAllergies] = useState(initial?.allergies ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const goal = Number(stepGoal);
  const errors = {
    name: name.trim() ? null : t('errName'),
    date: isValidDateKey(stentDate) && stentDate <= today ? null : t('errDate'),
    goal: Number.isInteger(goal) && goal > 0 ? null : t('errGoal'),
    phone: !emergencyPhone.trim() || emergencyPhone.replace(/\D/g, '').length >= 10 ? null : t('errPhone'),
  };
  const show = (e: string | null) => (showErrors ? e : null);

  const submit = () => {
    if (Object.values(errors).some(Boolean)) { setShowErrors(true); return; }
    onSubmit({
      name: name.trim(), stentDate, programStart: initial?.programStart ?? today, stepGoal: goal,
      emergencyName: emergencyName.trim(), emergencyPhone: emergencyPhone.trim(), doctorName: doctorName.trim(), allergies: allergies.trim(),
    });
  };

  const opt = (s: string) => `${s} (${t('optional')})`;
  return (
    <View style={{ gap: space.lg }}>
      <Field label={t('name')} value={name} onChangeText={setName} error={show(errors.name)} />
      <Field label={t('stentDate')} value={stentDate} onChangeText={setStentDate} hint={t('dateHint', { example: today })} error={show(errors.date)} keyboardType="numbers-and-punctuation" />
      <Field label={t('stepGoal')} value={stepGoal} onChangeText={setStepGoal} hint={t('stepGoalHint')} error={show(errors.goal)} keyboardType="number-pad" />
      <Field label={opt(t('emergencyName'))} value={emergencyName} onChangeText={setEmergencyName} />
      <Field label={opt(t('emergencyPhone'))} value={emergencyPhone} onChangeText={setEmergencyPhone} error={show(errors.phone)} keyboardType="phone-pad" />
      <Field label={opt(t('doctorName'))} value={doctorName} onChangeText={setDoctorName} />
      <Field label={opt(t('allergies'))} value={allergies} onChangeText={setAllergies} />
      <Button kind="primary" label={submitLabel} onPress={submit} />
    </View>
  );
}
