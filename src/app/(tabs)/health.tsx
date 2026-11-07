import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBand } from '../../band/BandProvider';
import { dateKey, formatDateTime, weekdayShort } from '../../lib/dates';
import { lastDays, visibleMetrics } from '../../lib/logic';
import { useLang, useStore, useT } from '../../lib/store';
import { BarChart, type Bar } from '../../ui/BarChart';
import { Banner, Button, Row, Screen, T } from '../../ui/kit';
import { space } from '../../ui/theme';

export default function Health() {
  const { state } = useStore();
  const band = useBand();
  const t = useT();
  const lang = useLang();
  const [pulseState, setPulseState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const days = lastDays(dateKey(new Date()), 7);
  const label = (k: string) => weekdayShort(k, lang);
  const metrics = days.map((d) => ({ key: d, m: visibleMetrics(state, d) }));
  const summary = (title: string, bars: Bar[]) => t('chartSummary', { title, values: bars.map((b) => `${b.label} ${b.text}`).join(', ') });
  const dur = (m: number) => t('hoursMinutes', { h: Math.floor(m / 60), m: m % 60 });

  const stepBars: Bar[] = metrics.map(({ key, m }) => ({ key, label: label(key), value: m?.steps ?? null, text: m ? m.steps.toLocaleString('ru-RU') : t('noData') }));
  const hrBars: Bar[] = metrics.map(({ key, m }) => ({ key, label: label(key), value: m?.hrMax ?? null, low: m?.hrMin ?? null, text: m?.hrAvg != null ? `${m.hrMin}–${m.hrMax} ${t('bpm')}` : t('noData') }));
  const sleepBars: Bar[] = metrics.map(({ key, m }) => ({ key, label: label(key), value: m?.sleepMinutes ?? null, text: m?.sleepMinutes != null ? dur(m.sleepMinutes) : t('noData') }));

  const measure = async () => {
    setPulseState('busy');
    const v = await band.measurePulse();
    setPulseState(v === null ? 'failed' : 'idle');
  };
  const canMeasure = state.band.mode === 'demo' || band.status === 'connected';

  return (
    <Screen>
      <T v="title" accessibilityRole="header">{t('healthTitle')}</T>
      {state.band.mode === 'demo' && <Banner text={t('demoBadge')} />}
      {state.band.mode === 'none' && <Row icon="band" label={t('bracelet')} detail={t('connectBandCta')} onPress={() => router.push('/device')} />}

      {state.band.mode !== 'none' && (
        <View style={styles.block}>
          <View style={styles.pulse}>
            <T v="caption">{t('pulse')}</T>
            <T v="hero">{state.band.lastPulse ?? '—'} <T v="caption">{t('bpm')}</T></T>
          </View>
          <Button label={pulseState === 'busy' ? t('measuring') : t('measurePulse')} disabled={pulseState === 'busy' || !canMeasure} onPress={measure} />
          {pulseState === 'failed' && <T v="caption">{t('measureFailed')}</T>}
          <T v="caption">{t('tapBar')}</T>
          <BarChart title={t('steps')} bars={stepBars} goal={state.profile?.stepGoal} goalLabel={t('goalLine')} emptyText={t('noData')} summaryLabel={summary(t('steps'), stepBars)} />
          <BarChart title={t('pulse')} bars={hrBars} emptyText={t('noData')} summaryLabel={summary(t('pulse'), hrBars)} />
          <BarChart title={t('sleep')} bars={sleepBars} emptyText={state.band.mode === 'real' ? t('sleepUnavailable') : t('noData')} summaryLabel={summary(t('sleep'), sleepBars)} />
        </View>
      )}

      <View style={styles.block}>
        <T v="lead">{t('bpTitle')}</T>
        <Button icon="plus" label={t('bpAdd')} onPress={() => router.push('/bp-add')} />
        {state.bp.length === 0 && <T v="caption">{t('bpEmpty')}</T>}
        {[...state.bp].sort((a, b) => b.at - a.at).slice(0, 14).map((b) => (
          <View key={b.id} style={styles.bpRow}>
            <T v="lead">{b.systolic}/{b.diastolic}</T>
            <T v="caption" style={styles.bpMeta}>
              {formatDateTime(b.at, lang)}
              {b.pulse ? ` · ${b.pulse} ${t('bpm')}` : ''}
            </T>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  pulse: { gap: 2 },
  bpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  bpMeta: { flexShrink: 1 },
});
