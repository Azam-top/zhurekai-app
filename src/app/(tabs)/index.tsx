import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { dateKey } from '../../lib/dates';
import { PROGRAM_DAYS, checkInResult, dosesForDay, lowSupplyMeds, programDay, setDoseTaken, supplyDaysLeft, visibleMetrics } from '../../lib/logic';
import { useStore, useT } from '../../lib/store';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { Banner, Button, Call103, Card, Row, Screen, T } from '../../ui/kit';
import { color, font, space } from '../../ui/theme';

export default function Today() {
  const { state, update } = useStore();
  const t = useT();
  const profile = state.profile!;
  const today = dateKey(new Date());
  const day = programDay(profile.programStart, today);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'greetingMorning' : hour < 18 ? 'greetingDay' : 'greetingEvening';

  const doses = dosesForDay(state, today);
  const pending = doses.filter((d) => !d.taken);
  const taken = doses.filter((d) => d.taken);
  const next = pending[0];
  const metrics = visibleMetrics(state, today);
  const hasBand = state.band.mode !== 'none';
  const checkIn = state.checkIns.find((c) => c.date === today);
  const urgent = checkIn && checkInResult(checkIn) === 'urgent';
  const pulse = state.band.lastPulse ?? metrics?.hrAvg ?? null;

  const take = (medId: string, time: string, value: boolean) => {
    update((s) => setDoseTaken(s, medId, today, time, value));
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Logo height={26} />
        <T v="label">{day <= PROGRAM_DAYS ? t('dayOf', { day, total: PROGRAM_DAYS }) : t('programDone', { day })}</T>
      </View>
      <T v="hero" accessibilityRole="header">{t(greeting, { name: profile.name })}</T>

      {urgent && (
        <Card tint="danger">
          <T style={{ color: color.danger, fontFamily: font.semibold }}>{t('urgentToday')}</T>
          <Call103 />
        </Card>
      )}

      {lowSupplyMeds(state, today).map((m) => {
        const days = supplyDaysLeft(m)!;
        return <Banner key={m.id} text={days === 0 ? t('lowSupplyOut', { name: m.name }) : t('lowSupplyBanner', { name: m.name, days })} />;
      })}

      <View style={styles.section}>
        <T v="lead">{t('nextDose')}</T>
        {doses.length === 0 ? (
          <Card>
            <T>{t('noMedsToday')}</T>
            <Button label={t('addMedsCta')} icon="plus" onPress={() => router.push('/med-edit')} />
          </Card>
        ) : next ? (
          <Card>
            <T v="caption">{next.time}</T>
            <T v="title">{next.med.name}</T>
            <T>{next.med.dose}</T>
            <Button kind="primary" icon="check" label={t('taken')} onPress={() => take(next.med.id, next.time, true)} />
          </Card>
        ) : (
          <Banner tint="ok" icon="check" text={t('allDosesDone')} />
        )}
        {pending.slice(1).map((d) => (
          <View key={d.id} style={styles.dose}>
            <T v="caption" style={styles.time}>{d.time}</T>
            <T style={styles.grow}>{d.med.name}, {d.med.dose}</T>
          </View>
        ))}
        {taken.map((d) => (
          <View key={d.id} style={styles.dose}>
            <Icon name="check" color={color.ok} />
            <T v="caption" style={styles.grow}>{d.time} · {d.med.name} · {t('takenDone')}</T>
            <T v="label" onPress={() => take(d.med.id, d.time, false)} accessibilityRole="button" style={styles.undo}>{t('undo')}</T>
          </View>
        ))}
      </View>

      <Row icon={checkIn ? 'check' : 'heart'} label={checkIn ? t('checkInDone') : t('checkInCta')} detail={checkIn ? undefined : t('checkInLater')} onPress={() => router.push('/check-in')} />

      {hasBand ? (
        <View style={styles.section}>
          {state.band.mode === 'demo' && <Banner text={t('demoBadge')} />}
          <View style={styles.stats}>
            <Stat label={t('pulse')} value={pulse === null ? '—' : String(pulse)} unit={t('bpm')} />
            <Stat label={t('steps')} value={metrics ? metrics.steps.toLocaleString('ru-RU') : '—'} unit={t('stepsOfGoal', { goal: profile.stepGoal.toLocaleString('ru-RU') })} />
          </View>
          <View style={styles.stats}>
            <Stat label={t('sleep')} value={metrics?.sleepMinutes != null ? t('hoursMinutes', { h: Math.floor(metrics.sleepMinutes / 60), m: metrics.sleepMinutes % 60 }) : '—'} />
          </View>
        </View>
      ) : (
        <Row icon="band" label={t('bracelet')} detail={t('connectBandCta')} onPress={() => router.push('/device')} />
      )}

      <Row icon="card" label={t('emergencyCard')} onPress={() => router.push('/emergency')} />
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <T v="caption">{label}</T>
      <T v="title">{value}</T>
      {unit ? <T v="caption">{unit}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  section: { gap: space.md },
  dose: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  time: { width: 52 },
  grow: { flex: 1 },
  undo: { paddingVertical: space.md, paddingLeft: space.sm, textDecorationLine: 'underline' },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, backgroundColor: color.bgAlt, borderRadius: 16, padding: space.lg, gap: 2 },
});
