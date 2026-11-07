import { addDays } from '../lib/dates';
import type { DayMetrics } from '../lib/types';

/** Repeatable sample data per date, always tagged `demo`. */
function noise(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export function demoMetrics(today: string, days = 14, now = Date.now()): Record<string, DayMetrics> {
  const out: Record<string, DayMetrics> = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const hrAvg = 66 + Math.round(noise(date, 2) * 12);
    out[date] = {
      date, source: 'demo',
      steps: 2400 + Math.round(noise(date, 1) * 3600),
      distance: 1700 + Math.round(noise(date, 5) * 2500),
      hrAvg, hrMin: hrAvg - 11, hrMax: hrAvg + 28,
      sleepMinutes: 340 + Math.round(noise(date, 3) * 130),
      updatedAt: now,
    };
  }
  return out;
}
