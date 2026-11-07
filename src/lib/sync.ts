import type { AppState } from './types';

export type RecordKind = 'med' | 'dose' | 'checkin' | 'bp' | 'metrics';
export interface SyncRecord { kind: RecordKind; id: string; updatedAt: number; data: unknown }

/**
 * Records changed since the last upload. Demo data and identifying details
 * (name, emergency contact) stay on the phone.
 */
export function pendingRecords(state: AppState): SyncRecord[] {
  const since = state.lastServerSync ?? 0;
  const out: SyncRecord[] = [];
  const add = (kind: RecordKind, id: string, updatedAt: number, data: unknown) => {
    if (updatedAt > since) out.push({ kind, id, updatedAt, data });
  };
  state.meds.forEach((m) => add('med', m.id, m.updatedAt, m));
  state.doses.forEach((d) => add('dose', d.id, d.updatedAt, d));
  state.checkIns.forEach((c) => add('checkin', c.id, c.updatedAt, c));
  state.bp.forEach((b) => add('bp', b.id, b.updatedAt, b));
  Object.values(state.metrics).forEach((m) => {
    if (m.source === 'band') add('metrics', m.date, m.updatedAt, m);
  });
  return out;
}

export type SyncOutcome =
  | { status: 'skipped'; reason: 'no-server' | 'insecure-server' | 'no-consent' | 'no-code' }
  | { status: 'ok'; sent: number; syncedAt: number }
  | { status: 'error'; message: string };

export interface SyncConfig { apiUrl: string; token: string | null }

export async function syncNow(state: AppState, cfg: SyncConfig, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<SyncOutcome> {
  if (!cfg.apiUrl) return { status: 'skipped', reason: 'no-server' };
  if (!cfg.apiUrl.startsWith('https://')) return { status: 'skipped', reason: 'insecure-server' };
  if (!state.syncConsent) return { status: 'skipped', reason: 'no-consent' };
  if (!cfg.token) return { status: 'skipped', reason: 'no-code' };
  const records = pendingRecords(state);
  if (!records.length) return { status: 'ok', sent: 0, syncedAt: now };
  try {
    const res = await fetchFn(`${cfg.apiUrl.replace(/\/$/, '')}/v1/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ schema: 1, records }),
    });
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return { status: 'ok', sent: records.length, syncedAt: now };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
