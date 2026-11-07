import { describe, expect, it } from 'vitest';
import { BandClient, type BandTransport } from '../src/band/client';
import { makePacket } from '../src/band/protocol';

class FakeTransport implements BandTransport {
  written: Uint8Array[] = [];
  private cb: (p: Uint8Array) => void = () => {};
  reply: (p: Uint8Array) => Uint8Array[] = () => [];
  scan() { return () => {}; }
  async connect() {}
  async write(p: Uint8Array) {
    this.written.push(p);
    for (const r of this.reply(p)) queueMicrotask(() => this.cb(r));
  }
  onPacket(cb: (p: Uint8Array) => void) { this.cb = cb; }
  onDisconnect() {}
  async disconnect() {}
}

describe('BandClient', () => {
  it('reads battery', async () => {
    const t = new FakeTransport();
    t.reply = () => [makePacket(3, [64, 1])];
    expect(await new BandClient(t).battery()).toEqual({ level: 64, charging: true });
  });
  it('runs requests one at a time', async () => {
    const t = new FakeTransport();
    t.reply = (p) => (p[0] === 3 ? [makePacket(3, [50, 0])] : [makePacket(0x43, [0xff])]);
    const c = new BandClient(t);
    const [b, s] = await Promise.all([c.battery(), c.steps(0)]);
    expect(b.level).toBe(50);
    expect(s).toEqual([]);
    expect(t.written.map((p) => p[0])).toEqual([3, 0x43]);
  });
  it('ignores replies with a bad checksum, then times out', async () => {
    const t = new FakeTransport();
    t.reply = () => { const p = makePacket(3, [50]); p[15] = 0; return [p]; };
    await expect(new BandClient(t, () => {}, 20).battery()).rejects.toThrow('timeout');
  });
  it('recovers after a timeout', async () => {
    const t = new FakeTransport();
    const c = new BandClient(t, () => {}, 20);
    await expect(c.battery()).rejects.toThrow();
    t.reply = () => [makePacket(3, [10, 0])];
    expect((await c.battery()).level).toBe(10);
  });
  it('measures pulse, skips zero readings and always stops the sensor', async () => {
    const t = new FakeTransport();
    t.reply = (p) => (p[0] === 0x69 ? [makePacket(0x69, [1, 0, 0]), makePacket(0x69, [1, 0, 74])] : []);
    expect(await new BandClient(t).measurePulse()).toBe(74);
    expect(t.written.map((p) => p[0])).toEqual([0x69, 0x6a]);
  });
});
