import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import { makeT, type T } from '../i18n';
import { initialState } from './logic';
import { syncReminders } from './reminders';
import { syncNow, type SyncOutcome } from './sync';
import { loadToken } from './token';
import type { AppState, Lang } from './types';

const KEY = 'zhurekai.state.v1';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

interface Ctx {
  state: AppState;
  ready: boolean;
  update: (fn: (s: AppState) => AppState) => void;
  uploadNow: () => Promise<SyncOutcome>;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const lang: Lang = state.lang ?? 'ru';
  useEffect(() => {
    if (ready && state.profile) syncReminders(state.meds, makeT(lang));
  }, [ready, state.meds, state.profile, lang]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const uploadNow = useCallback(async () => {
    const outcome = await syncNow(latest.current, { apiUrl: API_URL, token: await loadToken() });
    if (outcome.status === 'ok') setState((s) => ({ ...s, lastServerSync: outcome.syncedAt }));
    return outcome;
  }, []);

  useEffect(() => {
    if (!ready) return;
    uploadNow();
    const sub = RNAppState.addEventListener('change', (s) => { if (s === 'active') uploadNow(); });
    return () => sub.remove();
  }, [ready, uploadNow]);

  const value = useMemo(() => ({ state, ready, update, uploadNow }), [state, ready, update, uploadNow]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

export function useLang(): Lang {
  return useStore().state.lang ?? 'ru';
}

export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}
