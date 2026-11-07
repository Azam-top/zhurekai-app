/**
 * Wire protocol for QRing-family devices, following the MIT-licensed
 * tahnok/colmi_r02_client. It is documented for Colmi R02 rings; whether the
 * GAWSUG Y25 band matches it has to be confirmed on the real device.
 */
export const UART_SERVICE = '6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E';
export const UART_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
export const UART_TX = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

export const CMD = { setTime: 0x01, battery: 0x03, hrLog: 0x15, steps: 0x43, realTimeStart: 0x69, realTimeStop: 0x6a } as const;
export const REAL_TIME_HEART_RATE = 1;

export function checksum(bytes: Uint8Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += bytes[i] ?? 0;
  return sum & 255;
}

export function makePacket(command: number, sub: number[] = []): Uint8Array {
  if (sub.length > 14) throw new Error('subdata too long');
  const p = new Uint8Array(16);
  p[0] = command;
  p.set(sub, 1);
  p[15] = checksum(p);
  return p;
}

export function isValidPacket(p: Uint8Array): boolean {
  return p.length === 16 && p[15] === checksum(p);
}

export const toHex = (p: Uint8Array) => Array.from(p, (b) => b.toString(16).padStart(2, '0')).join(' ');
const toBcd = (n: number) => (Math.floor(n / 10) << 4) | n % 10;
const fromBcd = (b: number) => (b >> 4) * 10 + (b & 0x0f);

export const batteryPacket = () => makePacket(CMD.battery);

export function parseBattery(p: Uint8Array) {
  return { level: p[1], charging: p[2] !== 0 };
}

/** The ring clock is set in UTC, so every timestamp it returns is UTC too. */
export function setTimePacket(d: Date): Uint8Array {
  return makePacket(CMD.setTime, [
    toBcd(d.getUTCFullYear() % 2000), toBcd(d.getUTCMonth() + 1), toBcd(d.getUTCDate()),
    toBcd(d.getUTCHours()), toBcd(d.getUTCMinutes()), toBcd(d.getUTCSeconds()), 1,
  ]);
}

export const realTimeStartPacket = (kind = REAL_TIME_HEART_RATE) => makePacket(CMD.realTimeStart, [kind, 1]);
export const realTimeStopPacket = (kind = REAL_TIME_HEART_RATE) => makePacket(CMD.realTimeStop, [kind, 0, 0]);

export function parseRealTime(p: Uint8Array): { kind: number; value: number; error: number } {
  return { kind: p[1], error: p[2], value: p[3] };
}

export const stepsPacket = (dayOffset: number) => makePacket(CMD.steps, [dayOffset, 0x0f, 0x00, 0x5f, 0x01]);

export interface StepSlot { at: Date; steps: number; calories: number; distance: number }

/** Reassembles a multi-packet step log. feed() returns the log once complete. */
export class StepsParser {
  private slots: StepSlot[] = [];
  private newCalories = false;
  private sawHeader = false;

  feed(p: Uint8Array): StepSlot[] | null {
    if (p[1] === 0xff) { this.reset(); return []; }
    if (p[1] === 0xf0 && !this.sawHeader) {
      this.sawHeader = true;
      this.newCalories = p[3] === 1;
      return null;
    }
    const idx = p[4];
    this.slots.push({
      at: new Date(Date.UTC(2000 + fromBcd(p[1]), fromBcd(p[2]) - 1, fromBcd(p[3]), Math.floor(idx / 4), (idx % 4) * 15)),
      calories: (p[7] | (p[8] << 8)) * (this.newCalories ? 10 : 1),
      steps: p[9] | (p[10] << 8),
      distance: p[11] | (p[12] << 8),
    });
    if (p[5] === p[6] - 1) {
      const out = this.slots;
      this.reset();
      return out;
    }
    return null;
  }

  private reset() { this.slots = []; this.newCalories = false; this.sawHeader = false; }
}

export function hrLogPacket(startOfDay: Date): Uint8Array {
  const t = Math.floor(startOfDay.getTime() / 1000);
  return makePacket(CMD.hrLog, [t & 255, (t >>> 8) & 255, (t >>> 16) & 255, (t >>> 24) & 255]);
}

export interface HrSample { at: Date; bpm: number }

/** Reassembles a heart-rate log, dropping empty (zero) slots. */
export class HrLogParser {
  private size = 0;
  private range = 5;
  private start = 0;
  private values: number[] = [];

  feed(p: Uint8Array): HrSample[] | null {
    const sub = p[1];
    if (sub === 255) { this.size = 0; this.values = []; return []; }
    if (sub === 0) {
      this.size = p[2];
      this.range = p[3] || 5;
      this.values = [];
      return this.size === 0 ? [] : null;
    }
    if (sub === 1) {
      this.start = (p[2] | (p[3] << 8) | (p[4] << 16) | (p[5] << 24)) * 1000;
      this.values.push(...p.slice(6, 15));
    } else {
      this.values.push(...p.slice(2, 15));
    }
    if (sub !== this.size - 1) return null;
    const stepMs = this.range * 60_000;
    const now = Date.now();
    return this.values
      .map((bpm, i) => ({ at: new Date(this.start + i * stepMs), bpm }))
      .filter((s) => s.bpm > 0 && s.at.getTime() <= now);
  }
}
