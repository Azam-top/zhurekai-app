import { describe, expect, it } from 'vitest';
import { mergeBandData } from '../src/band/aggregate';
import { demoMetrics } from '../src/band/demo';
import { makeT } from '../src/i18n';
import { kk } from '../src/i18n/kk';
import { ru } from '../src/i18n/ru';
import { addDays, dateKey, formatDate, isValidDateKey, normalizeTime, weekdayShort } from '../src/lib/dates';
import { adherence, checkInResult, dosesForDay, initialState, isPlausibleBp, lowSupplyMeds, periodSummary, programDay, setDoseTaken, supplyDaysLeft } from '../src/lib/logic';
import { buildReportHtml, escapeHtml } from '../src/lib/report';
import { pendingRecords, syncNow } from '../src/lib/sync';
import type { AppState, Med } from '../src/lib/types';

const med = (over: Partial<Med> = {}): Med => ({ id: 'm1', name: 'Аспирин', dose: '75 мг', times: ['09:00', '21:00'], pillsLeft: 10, pillsPerDose: 1, startDate: '2026-11-01', endDate: null, updatedAt: 1, ...over });
const state = (over: Partial<AppState> = {}): AppState => ({ ...initialState, meds: [med()], ...over });

describe('doses and supply', () => {
  it('counts down on take, restores on undo, ignores repeats', () => {
    let s = setDoseTaken(state(), 'm1', '2026-11-07', '09:00', true, 5);
    expect(s.meds[0].pillsLeft).toBe(9);
    expect(setDoseTaken(s, 'm1', '2026-11-07', '09:00', true, 6)).toBe(s);
    s = setDoseTaken(s, 'm1', '2026-11-07', '09:00', false, 7);
    expect(s.meds[0].pillsLeft).toBe(10);
    expect(dosesForDay(s, '2026-11-07').every((d) => !d.taken)).toBe(true);
  });
  it('never goes below zero', () => {
    const s = setDoseTaken(state({ meds: [med({ pillsLeft: 0 })] }), 'm1', '2026-11-07', '09:00', true);
    expect(s.meds[0].pillsLeft).toBe(0);
  });
  it('leaves untracked supply alone', () => {
    const s = setDoseTaken(state({ meds: [med({ pillsLeft: null })] }), 'm1', '2026-11-07', '09:00', true);
    expect(s.meds[0].pillsLeft).toBeNull();
    expect(supplyDaysLeft(s.meds[0])).toBeNull();
  });
  it('flags low supply only for active meds within 7 days', () => {
    expect(supplyDaysLeft(med({ pillsLeft: 15 }))).toBe(7);
    expect(lowSupplyMeds(state({ meds: [med({ pillsLeft: 15 })] }), '2026-11-07')).toHaveLength(1);
    expect(lowSupplyMeds(state({ meds: [med({ pillsLeft: 16 })] }), '2026-11-07')).toHaveLength(0);
    expect(lowSupplyMeds(state({ meds: [med({ pillsLeft: 1, endDate: '2026-11-05' })] }), '2026-11-07')).toHaveLength(0);
  });
  it('does not count doses that are not due yet as missed', () => {
    const s = setDoseTaken(state(), 'm1', '2026-11-07', '09:00', true);
    const a = adherence(s, '2026-11-07', '2026-11-07', new Date(2026, 10, 7, 12, 0));
    expect(a).toEqual({ due: 1, taken: 1, percent: 100 });
  });
  it('counts earlier missed doses', () => {
    const a = adherence(state(), '2026-11-06', '2026-11-06', new Date(2026, 10, 7, 12, 0));
    expect(a).toEqual({ due: 2, taken: 0, percent: 0 });
  });
  it('reports null adherence with nothing due', () => expect(adherence(state({ meds: [] }), '2026-11-06', '2026-11-07').percent).toBeNull());
});

describe('check-in rules', () => {
  const none = { chestPain: 'none', breath: 'none', dizzy: 'none', bleeding: 'none', swelling: 'none' } as const;
  it('ok', () => expect(checkInResult(none)).toBe('ok'));
  it('mild goes to the doctor', () => expect(checkInResult({ ...none, swelling: 'mild' })).toBe('tellDoctor'));
  it('severe swelling at the site still goes to the doctor', () => expect(checkInResult({ ...none, swelling: 'severe' })).toBe('tellDoctor'));
  for (const k of ['chestPain', 'breath', 'dizzy', 'bleeding'] as const) {
    it(`severe ${k} is urgent`, () => expect(checkInResult({ ...none, [k]: 'severe' })).toBe('urgent'));
  }
});

describe('dates and validation', () => {
  it('program day starts at 1', () => {
    expect(programDay('2026-11-07', '2026-11-07')).toBe(1);
    expect(programDay('2026-11-01', '2026-11-07')).toBe(7);
  });
  it('formats dates in both languages', () => {
    expect(formatDate('2026-11-07', 'ru')).toBe('7 ноября');
    expect(formatDate('2026-11-07', 'kk')).toBe('7 қараша');
    expect(weekdayShort('2026-11-07', 'kk')).toBe('сб');
  });
  it('crosses month boundaries', () => expect(addDays('2026-11-30', 1)).toBe('2026-12-01'));
  it('rejects impossible dates', () => { expect(isValidDateKey('2026-02-30')).toBe(false); expect(isValidDateKey('2026-02-28')).toBe(true); });
  it('normalizes times', () => { expect(normalizeTime('9:00')).toBe('09:00'); expect(normalizeTime('9.30')).toBe('09:30'); expect(normalizeTime('25:00')).toBeNull(); });
  it('checks BP plausibility', () => { expect(isPlausibleBp(120, 80)).toBe(true); expect(isPlausibleBp(80, 120)).toBe(false); expect(isPlausibleBp(1200, 80)).toBe(false); });
});

describe('band data', () => {
  it('buckets by local day and sums steps', () => {
    const at = new Date(2026, 10, 7, 10, 0);
    const out = mergeBandData({}, [{ at, steps: 100, calories: 0, distance: 70 }, { at, steps: 50, calories: 0, distance: 30 }], [{ at, bpm: 60 }, { at, bpm: 80 }], 9);
    expect(out['2026-11-07']).toMatchObject({ steps: 150, distance: 100, hrAvg: 70, hrMin: 60, hrMax: 80, source: 'band', sleepMinutes: null });
  });
  it('demo data varies between days', () => {
    const steps = Object.values(demoMetrics('2026-11-07', 7)).map((m) => m.steps);
    expect(Math.max(...steps) - Math.min(...steps)).toBeGreaterThan(800);
  });
  it('real data replaces demo data for the day', () => {
    const today = dateKey(new Date(2026, 10, 7));
    const out = mergeBandData(demoMetrics(today), [{ at: new Date(2026, 10, 7, 9), steps: 5, calories: 0, distance: 1 }], []);
    expect(out[today]).toMatchObject({ source: 'band', steps: 5, sleepMinutes: null, hrAvg: null });
  });
  it('hides demo data unless demo mode is on', () => {
    const metrics = demoMetrics('2026-11-07');
    expect(periodSummary(state({ metrics }), '2026-11-01', '2026-11-07').steps).toBeNull();
    expect(periodSummary(state({ metrics, band: { ...initialState.band, mode: 'demo' } }), '2026-11-01', '2026-11-07').steps).not.toBeNull();
  });
});

describe('sync', () => {
  const ok = (async () => new Response('{}')) as typeof fetch;
  const consented = (over: Partial<AppState> = {}) => state({ syncConsent: true, ...over });
  it('never uploads without server, https, consent or code', async () => {
    expect(await syncNow(consented(), { apiUrl: '', token: 'x' }, ok)).toMatchObject({ reason: 'no-server' });
    expect(await syncNow(consented(), { apiUrl: 'http://uni.kz', token: 'x' }, ok)).toMatchObject({ reason: 'insecure-server' });
    expect(await syncNow(state(), { apiUrl: 'https://uni.kz', token: 'x' }, ok)).toMatchObject({ reason: 'no-consent' });
    expect(await syncNow(consented(), { apiUrl: 'https://uni.kz', token: null }, ok)).toMatchObject({ reason: 'no-code' });
  });
  it('excludes demo data and only sends changes', () => {
    const s = consented({ metrics: demoMetrics('2026-11-07'), lastServerSync: 0 });
    expect(pendingRecords(s).map((r) => r.kind)).toEqual(['med']);
    expect(pendingRecords({ ...s, lastServerSync: 5 })).toEqual([]);
  });
  it('excludes the patient name and emergency contact', async () => {
    let body = '';
    const f = (async (_u: string, init: RequestInit) => { body = String(init.body); return new Response('{}'); }) as typeof fetch;
    const profile = { name: 'Айгуль', stentDate: '2026-11-01', programStart: '2026-11-01', emergencyName: 'Ерлан', emergencyPhone: '+77001234567', doctorName: '', allergies: '', stepGoal: 5000 };
    const r = await syncNow(consented({ profile }), { apiUrl: 'https://uni.kz/', token: 'tok' }, f, 42);
    expect(r).toEqual({ status: 'ok', sent: 1, syncedAt: 42 });
    expect(body).not.toContain('Айгуль');
    expect(body).not.toContain('+77001234567');
  });
  it('reports HTTP and network failures', async () => {
    expect(await syncNow(consented(), { apiUrl: 'https://uni.kz', token: 't' }, (async () => new Response('', { status: 500 })) as typeof fetch)).toEqual({ status: 'error', message: 'HTTP 500' });
    expect(await syncNow(consented(), { apiUrl: 'https://uni.kz', token: 't' }, (async () => { throw new Error('offline'); }) as typeof fetch)).toEqual({ status: 'error', message: 'offline' });
  });
});

describe('translations', () => {
  it('Kazakh keeps every placeholder from Russian', () => {
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(params(kk[key]), key).toEqual(params(ru[key]));
    }
  });
  it('fills parameters', () => expect(makeT('ru')('dayOf', { day: 12, total: 90 })).toBe('День 12 из 90'));
});

describe('report', () => {
  const profile = { name: '<b>Айгуль</b>', stentDate: '2026-11-01', programStart: '2026-11-01', emergencyName: '', emergencyPhone: '', doctorName: '', allergies: '', stepGoal: 5000 };
  it('escapes patient-entered text', () => {
    const html = buildReportHtml(state({ profile, meds: [med({ name: '<script>x</script>' })] }), makeT('ru'), 'ru', 14, new Date(2026, 10, 7, 12));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Айгуль');
    expect(html).toContain(escapeHtml('<script>x</script>'));
  });
  it('warns when band data is demo', () => {
    const t = makeT('ru');
    const on = buildReportHtml(state({ profile, band: { ...initialState.band, mode: 'demo' } }), t, 'ru', 14);
    const off = buildReportHtml(state({ profile }), t, 'ru', 14);
    expect(on).toContain(t('reportDemoWarning'));
    expect(off).not.toContain(t('reportDemoWarning'));
  });
});
