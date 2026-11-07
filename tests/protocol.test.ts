import { describe, expect, it } from 'vitest';
import { HrLogParser, StepsParser, batteryPacket, checksum, hrLogPacket, isValidPacket, makePacket, parseBattery, parseRealTime, realTimeStartPacket, realTimeStopPacket, setTimePacket, stepsPacket, toHex } from '../src/band/protocol';

const hex = (s: string) => Uint8Array.from(s.split(' ').map((x) => parseInt(x, 16)));

describe('packets match documented examples from colmi_r02_client', () => {
  it('battery request', () => expect(toHex(batteryPacket())).toBe('03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03'));
  it('battery reply', () => expect(parseBattery(hex('03 40 00 00 00 00 00 00 00 00 00 00 00 00 00 43'))).toEqual({ level: 64, charging: false }));
  it('real-time start and stop', () => {
    expect(toHex(realTimeStartPacket())).toBe('69 01 01 00 00 00 00 00 00 00 00 00 00 00 00 6b');
    expect(toHex(realTimeStopPacket())).toBe('6a 01 00 00 00 00 00 00 00 00 00 00 00 00 00 6b');
  });
  it('steps request for today', () => expect(toHex(stepsPacket(0))).toBe('43 00 0f 00 5f 01 00 00 00 00 00 00 00 00 00 b2'));
  it('checksum wraps at 256', () => expect(checksum(makePacket(0xff, [0xff, 0x02]))).toBe(0));
  it('rejects a corrupted packet', () => {
    const p = batteryPacket(); p[3] = 9;
    expect(isValidPacket(p)).toBe(false);
  });
  it('set time uses BCD UTC', () => {
    const p = setTimePacket(new Date(Date.UTC(2026, 10, 7, 13, 5, 42)));
    expect(toHex(p.slice(0, 8))).toBe('01 26 11 07 13 05 42 01');
    expect(isValidPacket(p)).toBe(true);
  });
  it('hr log request is little-endian seconds', () => {
    const p = hrLogPacket(new Date(0x12345678 * 1000));
    expect(Array.from(p.slice(1, 5))).toEqual([0x78, 0x56, 0x34, 0x12]);
  });
  it('real-time reply', () => expect(parseRealTime(makePacket(0x69, [1, 0, 72]))).toEqual({ kind: 1, error: 0, value: 72 }));
});

describe('StepsParser', () => {
  it('parses the documented data packet', () => {
    const slots = new StepsParser();
    // Documented example is packet 0 of 5, so it doesn't complete the log.
    expect(slots.feed(hex('43 23 08 13 10 00 05 c8 00 30 00 1b 00 00 00 a9'))).toBeNull();
    const last = makePacket(0x43, [0x23, 0x08, 0x13, 0x14, 4, 5, 10, 0, 100, 1, 50, 0]);
    const out = slots.feed(last)!;
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ at: new Date(Date.UTC(2023, 7, 13, 4, 0)), calories: 200, steps: 48, distance: 27 });
    expect(out[1].steps).toBe(356);
  });
  it('applies the new-calorie header', () => {
    const p = new StepsParser();
    expect(p.feed(makePacket(0x43, [0xf0, 0, 1]))).toBeNull();
    const out = p.feed(makePacket(0x43, [0x26, 0x11, 0x07, 0, 0, 1, 5, 0, 1, 0]))!;
    expect(out[0].calories).toBe(50);
  });
  it('returns empty on no data', () => expect(new StepsParser().feed(makePacket(0x43, [0xff]))).toEqual([]));
});

describe('HrLogParser', () => {
  it('reassembles a three-packet log and drops zero slots', () => {
    const p = new HrLogParser();
    const ts = Date.UTC(2024, 0, 1) / 1000;
    expect(p.feed(makePacket(0x15, [0, 3, 5]))).toBeNull();
    expect(p.feed(makePacket(0x15, [1, ts & 255, (ts >>> 8) & 255, (ts >>> 16) & 255, (ts >>> 24) & 255, 60, 0, 62, 0, 0, 0, 0, 0, 0]))).toBeNull();
    const out = p.feed(makePacket(0x15, [2, 70, ...Array(12).fill(0)]))!;
    expect(out.map((s) => s.bpm)).toEqual([60, 62, 70]);
    expect(out[1].at.getTime()).toBe((ts + 600) * 1000);
    expect(out[2].at.getTime()).toBe((ts + 9 * 300) * 1000);
  });
  it('returns empty on error', () => expect(new HrLogParser().feed(makePacket(0x15, [255]))).toEqual([]));
  it('drops slots in the future', () => {
    const p = new HrLogParser();
    const ts = Math.floor(Date.now() / 1000) - 60;
    p.feed(makePacket(0x15, [0, 2, 5]));
    const out = p.feed(makePacket(0x15, [1, ts & 255, (ts >>> 8) & 255, (ts >>> 16) & 255, (ts >>> 24) & 255, 60, 61, 0, 0, 0, 0, 0, 0, 0]))!;
    expect(out.map((s) => s.bpm)).toEqual([60]);
  });
});
