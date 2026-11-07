import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addDays, dateKey, parseKey } from '../lib/dates';
import { useStore } from '../lib/store';
import type { BandInfo } from '../lib/types';
import { mergeBandData } from './aggregate';
import { BandClient, type FoundDevice } from './client';
import { demoMetrics } from './demo';
import type { HrSample, StepSlot } from './protocol';
import { BleTransport, bluetoothSupported } from './transport';

const HISTORY_DAYS = 7;
const NO_BAND: BandInfo = { mode: 'none', deviceId: null, deviceName: null, battery: null, lastSync: null, lastPulse: null };

export type BandStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'syncing';
export type BandError = 'mismatch' | 'connect' | 'sync' | null;

interface BandCtx {
  supported: boolean;
  status: BandStatus;
  error: BandError;
  devices: FoundDevice[];
  log: string[];
  startScan: () => void;
  stopScan: () => void;
  connect: (d: FoundDevice) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncBand: () => Promise<void>;
  measurePulse: () => Promise<number | null>;
  startDemo: () => void;
  stopDemo: () => void;
}

const Context = createContext<BandCtx | null>(null);

export function BandProvider({ children }: { children: ReactNode }) {
  const { state, ready, update } = useStore();
  const [status, setStatus] = useState<BandStatus>('idle');
  const [error, setError] = useState<BandError>(null);
  const [devices, setDevices] = useState<FoundDevice[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const transport = useRef<BleTransport | null>(null);
  const client = useRef<BandClient | null>(null);
  const stopScanning = useRef<(() => void) | null>(null);

  const addLog = useCallback((line: string) => setLog((l) => [...l.slice(-199), `${new Date().toISOString().slice(11, 19)} ${line}`]), []);

  /** Created on first use so iOS only asks for Bluetooth when the patient needs it. */
  const getTransport = useCallback(() => {
    if (!transport.current) {
      const t = new BleTransport();
      t.onDisconnect(() => {
        client.current = null;
        setStatus('idle');
        addLog('! disconnected');
      });
      transport.current = t;
      client.current = null;
    }
    return transport.current;
  }, [addLog]);

  const syncBand = useCallback(async () => {
    const c = client.current;
    if (!c) return;
    setStatus('syncing');
    setError(null);
    const slots: StepSlot[] = [];
    const samples: HrSample[] = [];
    const attempt = async (name: string, fn: () => Promise<void>) => {
      try { await fn(); return true; } catch (e) { addLog(`! ${name}: ${e instanceof Error ? e.message : e}`); return false; }
    };
    await attempt('setTime', () => c.setTime());
    let battery = 0;
    // A band that doesn't answer this won't answer the history requests either, so don't wait for each to time out.
    if (!await attempt('battery', async () => { battery = (await c.battery()).level; })) {
      setError('sync');
      setStatus('connected');
      return;
    }
    const today = dateKey(new Date());
    for (let i = 0; i < HISTORY_DAYS; i++) {
      await attempt(`steps ${i}`, async () => { slots.push(...await c.steps(i)); });
      await attempt(`hr ${i}`, async () => { samples.push(...await c.heartRateLog(parseKey(addDays(today, -i)))); });
    }
    const now = Date.now();
    update((s) => ({
      ...s,
      metrics: mergeBandData(s.metrics, slots, samples, now),
      band: { ...s.band, battery, lastSync: now },
    }));
    setStatus('connected');
  }, [addLog, update]);

  const connectTo = useCallback(async (id: string, name: string) => {
    setStatus('connecting');
    setError(null);
    const t = getTransport();
    try {
      addLog(`connect ${name} ${id}`);
      await t.connect(id);
      client.current = new BandClient(t, addLog);
      setStatus('connected');
      update((s) => {
        const metrics = Object.fromEntries(Object.entries(s.metrics).filter(([, m]) => m.source !== 'demo'));
        return { ...s, metrics, band: { ...s.band, mode: 'real', deviceId: id, deviceName: name } };
      });
      await syncBand();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      addLog(`! ${message}`);
      setError(message.startsWith('PROTOCOL_MISMATCH') ? 'mismatch' : 'connect');
      setStatus('idle');
    }
  }, [addLog, getTransport, syncBand, update]);

  const stopScan = useCallback(() => {
    stopScanning.current?.();
    stopScanning.current = null;
    setStatus((s) => (s === 'scanning' ? 'idle' : s));
  }, []);

  const startScan = useCallback(() => {
    if (!bluetoothSupported) return;
    setDevices([]);
    setError(null);
    setStatus('scanning');
    stopScanning.current = getTransport().scan((d) => {
      setDevices((list) => (list.some((x) => x.id === d.id) ? list : [...list, d]));
    });
  }, [getTransport]);

  const connect = useCallback(async (d: FoundDevice) => {
    stopScan();
    await connectTo(d.id, d.name);
  }, [connectTo, stopScan]);

  const reconnect = useCallback(async () => {
    const { deviceId, deviceName } = state.band;
    if (deviceId) await connectTo(deviceId, deviceName ?? 'Y25');
  }, [connectTo, state.band]);

  const disconnect = useCallback(async () => {
    await transport.current?.disconnect();
    client.current = null;
    setStatus('idle');
    update((s) => ({ ...s, band: NO_BAND }));
  }, [update]);

  const measurePulse = useCallback(async () => {
    if (state.band.mode === 'demo') {
      const value = 68 + Math.floor(Math.random() * 10);
      await new Promise((r) => setTimeout(r, 1200));
      update((s) => ({ ...s, band: { ...s.band, lastPulse: value } }));
      return value;
    }
    if (!client.current) return null;
    try {
      const value = await client.current.measurePulse();
      update((s) => ({ ...s, band: { ...s.band, lastPulse: value } }));
      return value;
    } catch (e) {
      addLog(`! pulse: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }, [addLog, state.band.mode, update]);

  const startDemo = useCallback(() => {
    const now = Date.now();
    update((s) => ({
      ...s,
      metrics: { ...demoMetrics(dateKey(new Date()), 14, now), ...Object.fromEntries(Object.entries(s.metrics).filter(([, m]) => m.source === 'band')) },
      band: { mode: 'demo', deviceId: null, deviceName: 'Demo Y25', battery: 84, lastSync: now, lastPulse: 72 },
    }));
  }, [update]);

  const stopDemo = useCallback(() => {
    update((s) => ({
      ...s,
      metrics: Object.fromEntries(Object.entries(s.metrics).filter(([, m]) => m.source !== 'demo')),
      band: NO_BAND,
    }));
  }, [update]);

  // Reconnects the saved bracelet whenever the app opens.
  const reconnected = useRef(false);
  useEffect(() => {
    if (!ready || reconnected.current || !bluetoothSupported) return;
    reconnected.current = true;
    const { mode, deviceId, deviceName } = state.band;
    if (mode === 'real' && deviceId) Promise.resolve().then(() => connectTo(deviceId, deviceName ?? 'Y25'));
  }, [ready, state.band, connectTo]);

  const value = useMemo(() => ({
    supported: bluetoothSupported, status, error, devices, log, startScan, stopScan, connect, reconnect, disconnect, syncBand, measurePulse, startDemo, stopDemo,
  }), [status, error, devices, log, startScan, stopScan, connect, reconnect, disconnect, syncBand, measurePulse, startDemo, stopDemo]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBand(): BandCtx {
  const c = useContext(Context);
  if (!c) throw new Error('BandProvider missing');
  return c;
}
