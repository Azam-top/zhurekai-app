import { useState } from 'react';
import { View } from 'react-native';
import type { TKey } from '../i18n';
import { dateKey } from '../lib/dates';
import { checkInResult } from '../lib/logic';
import { useStore, useT } from '../lib/store';
import type { CheckIn, Severity } from '../lib/types';
import { Button, Call103, Card, Screen, SubHeader, T, dismiss } from '../ui/kit';
import { color, space } from '../ui/theme';

type QKey = 'chestPain' | 'breath' | 'dizzy' | 'bleeding' | 'swelling';
const QUESTIONS: { key: QKey; label: TKey }[] = [
  { key: 'chestPain', label: 'qChestPain' }, { key: 'breath', label: 'qBreath' }, { key: 'dizzy', label: 'qDizzy' }, { key: 'bleeding', label: 'qBleeding' }, { key: 'swelling', label: 'qSwelling' },
];

export default function CheckInScreen() {
  const { update } = useStore();
  const t = useT();
  const [answers, setAnswers] = useState<Partial<Record<QKey, Severity>>>({});
  const [done, setDone] = useState<CheckIn | null>(null);
  const index = QUESTIONS.findIndex((q) => !answers[q.key]);

  const answer = (key: QKey, value: Severity) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (QUESTIONS.every((q) => next[q.key])) {
      const date = dateKey(new Date());
      const entry: CheckIn = { id: date, date, updatedAt: Date.now(), ...(next as Record<QKey, Severity>) };
      update((s) => ({ ...s, checkIns: [...s.checkIns.filter((c) => c.date !== date), entry] }));
      setDone(entry);
    }
  };

  if (done) {
    const result = checkInResult(done);
    const content = {
      urgent: { title: t('resultUrgentTitle'), text: t('resultUrgentText'), tint: 'danger' as const },
      tellDoctor: { title: t('resultDoctorTitle'), text: t('resultDoctorText'), tint: 'warn' as const },
      ok: { title: t('resultOkTitle'), text: t('resultOkText'), tint: 'ok' as const },
    }[result];
    return (
      <Screen>
        <SubHeader title={t('checkInTitle')} />
        <Card tint={content.tint}>
          <T v="hero" style={result === 'urgent' ? { color: color.danger } : undefined}>{content.title}</T>
          <T>{content.text}</T>
          {result !== 'ok' && <Call103 />}
        </Card>
        <Button kind="quiet" label={t('done')} onPress={dismiss} />
      </Screen>
    );
  }

  const q = QUESTIONS[index];
  return (
    <Screen>
      <SubHeader title={t('checkInTitle')} />
      <T v="label">{t('questionOf', { n: index + 1, total: QUESTIONS.length })}</T>
      <T v="hero" accessibilityRole="header">{t(q.label)}</T>
      <View style={{ gap: space.md }}>
        <Button label={t('aNone')} onPress={() => answer(q.key, 'none')} />
        <Button label={t('aMild')} onPress={() => answer(q.key, 'mild')} />
        <Button label={t('aSevere')} onPress={() => answer(q.key, 'severe')} />
      </View>
      <T v="caption">{t('checkInDisclaimer')}</T>
      <Call103 />
    </Screen>
  );
}
