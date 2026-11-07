import { addDays, dateKey, daysBetween } from './dates';
import type { AppState, BpEntry, CheckIn, DayMetrics, DoseLog, Med, Severity } from './types';

export const PROGRAM_DAYS = 90;
export const LOW_SUPPLY_DAYS = 7;

export const initialState: AppState = {
  version: 1, lang: null, profile: null, meds: [], doses: [], checkIns: [], bp: [], metrics: {},
  band: { mode: 'none', deviceId: null, deviceName: null, battery: null, lastSync: null, lastPulse: null },
  syncConsent: false, lastServerSync: null,
};

export function programDay(start: string, today: string): number {
  return Math.max(1, daysBetween(start, today) + 1);
}

export const doseId = (medId: string, date: string, time: string) => `${medId}:${date}:${time}`;
export const isActiveOn = (m: Med, date: string) => m.startDate <= date && (m.endDate === null || date <= m.endDate);

export interface ScheduledDose { med: Med; time: string; id: string; taken: boolean }

export function dosesForDay(state: AppState, date: string): ScheduledDose[] {
  const logged = new Set(state.doses.filter((d) => d.date === date && !d.deleted).map((d) => d.id));
  return state.meds
    .filter((m) => isActiveOn(m, date))
    .flatMap((med) => med.times.map((time) => {
      const id = doseId(med.id, date, time);
      return { med, time, id, taken: logged.has(id) };
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Marks or un-marks a dose, keeping the pill count in step. Repeat calls are harmless. */
export function setDoseTaken(state: AppState, medId: string, date: string, time: string, taken: boolean, now = Date.now()): AppState {
  const id = doseId(medId, date, time);
  const existing = state.doses.find((d) => d.id === id);
  const wasTaken = !!existing && !existing.deleted;
  if (wasTaken === taken) return state;
  const entry: DoseLog = { id, medId, date, time, takenAt: taken ? now : existing?.takenAt ?? now, deleted: !taken, updatedAt: now };
  return {
    ...state,
    doses: [...state.doses.filter((d) => d.id !== id), entry],
    meds: state.meds.map((m) => {
      if (m.id !== medId || m.pillsLeft === null) return m;
      const pillsLeft = Math.max(0, m.pillsLeft + (taken ? -m.pillsPerDose : m.pillsPerDose));
      return { ...m, pillsLeft, updatedAt: now };
    }),
  };
}

/** Whole days of supply left, or null when the patient doesn't track supply. */
export function supplyDaysLeft(m: Med): number | null {
  if (m.pillsLeft === null) return null;
  const perDay = m.pillsPerDose * m.times.length;
  return perDay > 0 ? Math.floor(m.pillsLeft / perDay) : null;
}

export function lowSupplyMeds(state: AppState, today: string): Med[] {
  return state.meds.filter((m) => {
    const days = supplyDaysLeft(m);
    return days !== null && days <= LOW_SUPPLY_DAYS && isActiveOn(m, today);
  });
}

/** Adherence counts doses already due, so a morning report doesn't count tonight's dose as missed. */
export function adherence(state: AppState, from: string, to: string, now = new Date()): { due: number; taken: number; percent: number | null } {
  const today = dateKey(now);
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let due = 0, taken = 0;
  for (let d = from; d <= to && d <= today; d = addDays(d, 1)) {
    for (const s of dosesForDay(state, d)) {
      if (d === today && s.time > clock && !s.taken) continue;
      due++;
      if (s.taken) taken++;
    }
  }
  return { due, taken, percent: due ? Math.round((taken / due) * 100) : null };
}

export type CheckInResult = 'urgent' | 'tellDoctor' | 'ok';

export function checkInResult(c: Pick<CheckIn, 'chestPain' | 'breath' | 'dizzy' | 'bleeding' | 'swelling'>): CheckInResult {
  if (c.chestPain === 'severe' || c.breath === 'severe' || c.bleeding === 'severe' || c.dizzy === 'severe') return 'urgent';
  const answers: Severity[] = [c.chestPain, c.breath, c.dizzy, c.bleeding, c.swelling];
  return answers.some((a) => a !== 'none') ? 'tellDoctor' : 'ok';
}

export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}

export const visibleMetrics = (state: AppState, date: string): DayMetrics | null => {
  const m = state.metrics[date];
  if (!m) return null;
  if (state.band.mode === 'demo') return m.source === 'demo' ? m : null;
  return m.source === 'band' ? m : null;
};

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

export interface PeriodSummary {
  steps: number | null;
  hr: number | null;
  sleepMinutes: number | null;
  bp: { systolic: number; diastolic: number; count: number } | null;
}

export function periodSummary(state: AppState, from: string, to: string): PeriodSummary {
  const days: DayMetrics[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const m = visibleMetrics(state, d);
    if (m) days.push(m);
  }
  const bp = bpInRange(state.bp, from, to);
  return {
    steps: average(days.filter((m) => m.steps > 0).map((m) => m.steps)),
    hr: average(days.flatMap((m) => (m.hrAvg === null ? [] : [m.hrAvg]))),
    sleepMinutes: average(days.flatMap((m) => (m.sleepMinutes === null ? [] : [m.sleepMinutes]))),
    bp: bp.length ? { systolic: average(bp.map((b) => b.systolic))!, diastolic: average(bp.map((b) => b.diastolic))!, count: bp.length } : null,
  };
}

export function bpInRange(entries: BpEntry[], from: string, to: string): BpEntry[] {
  return entries.filter((b) => {
    const k = dateKey(new Date(b.at));
    return k >= from && k <= to;
  }).sort((a, b) => b.at - a.at);
}

/** A plausibility check for typos only. It says nothing about whether a value is healthy. */
export function isPlausibleBp(systolic: number, diastolic: number): boolean {
  return Number.isInteger(systolic) && Number.isInteger(diastolic) && systolic >= 50 && systolic <= 300 && diastolic >= 30 && diastolic <= 200 && systolic > diastolic;
}
