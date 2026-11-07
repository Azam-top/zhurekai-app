import { dateKey } from '../lib/dates';
import type { DayMetrics } from '../lib/types';
import type { HrSample, StepSlot } from './protocol';

/** Buckets UTC device samples by the phone's local day and merges them into day metrics. */
export function mergeBandData(existing: Record<string, DayMetrics>, slots: StepSlot[], samples: HrSample[], now = Date.now()): Record<string, DayMetrics> {
  const steps = new Map<string, { steps: number; distance: number }>();
  for (const s of slots) {
    const k = dateKey(s.at);
    const cur = steps.get(k) ?? { steps: 0, distance: 0 };
    steps.set(k, { steps: cur.steps + s.steps, distance: cur.distance + s.distance });
  }
  const hr = new Map<string, number[]>();
  for (const s of samples) {
    const k = dateKey(s.at);
    hr.set(k, [...(hr.get(k) ?? []), s.bpm]);
  }
  const out = { ...existing };
  for (const date of new Set([...steps.keys(), ...hr.keys()])) {
    const prev = existing[date]?.source === 'band' ? existing[date] : undefined;
    const st = steps.get(date);
    const bpm = hr.get(date);
    out[date] = {
      date,
      source: 'band',
      steps: st?.steps ?? prev?.steps ?? 0,
      distance: st?.distance ?? prev?.distance ?? 0,
      hrAvg: bpm ? Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length) : prev?.hrAvg ?? null,
      hrMin: bpm ? Math.min(...bpm) : prev?.hrMin ?? null,
      hrMax: bpm ? Math.max(...bpm) : prev?.hrMax ?? null,
      sleepMinutes: prev?.sleepMinutes ?? null,
      updatedAt: now,
    };
  }
  return out;
}
