import {
  CMD, HrLogParser, StepsParser, batteryPacket, hrLogPacket, isValidPacket, parseBattery, parseRealTime,
  realTimeStartPacket, realTimeStopPacket, setTimePacket, stepsPacket, toHex,
  type HrSample, type StepSlot,
} from './protocol';

export interface FoundDevice { id: string; name: string; rssi: number | null }

export interface BandTransport {
  scan(onDevice: (d: FoundDevice) => void): () => void;
  connect(id: string): Promise<void>;
  write(packet: Uint8Array): Promise<void>;
  onPacket(cb: (p: Uint8Array) => void): void;
  onDisconnect(cb: () => void): void;
  disconnect(): Promise<void>;
}

type Pending = { cmd: number; handle: (p: Uint8Array) => boolean };

/** Sends one request at a time and routes replies by command byte. */
export class BandClient {
  private pending: Pending | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private transport: BandTransport, private log: (line: string) => void = () => {}, private timeoutMs = 6000) {
    transport.onPacket((p) => this.receive(p));
  }

  private receive(p: Uint8Array) {
    this.log(`< ${toHex(p)}`);
    if (!isValidPacket(p)) { this.log('! invalid packet ignored'); return; }
    if (this.pending && p[0] === this.pending.cmd && this.pending.handle(p)) this.pending = null;
  }

  /** Resolves when `handle` returns a non-undefined value for a reply to `cmd`. */
  private request<T>(packet: Uint8Array, cmd: number, handle: (p: Uint8Array) => T | undefined, timeoutMs = this.timeoutMs): Promise<T> {
    const run = () => new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new Error(`timeout waiting for 0x${cmd.toString(16)}`));
      }, timeoutMs);
      this.pending = {
        cmd,
        handle: (p) => {
          const value = handle(p);
          if (value === undefined) return false;
          clearTimeout(timer);
          resolve(value);
          return true;
        },
      };
      this.log(`> ${toHex(packet)}`);
      this.transport.write(packet).catch((e) => {
        clearTimeout(timer);
        this.pending = null;
        reject(e);
      });
    });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async setTime(now = new Date()) {
    const packet = setTimePacket(now);
    this.log(`> ${toHex(packet)}`);
    await this.transport.write(packet);
  }

  battery() {
    return this.request(batteryPacket(), CMD.battery, parseBattery);
  }

  steps(dayOffset: number): Promise<StepSlot[]> {
    const parser = new StepsParser();
    return this.request(stepsPacket(dayOffset), CMD.steps, (p) => parser.feed(p) ?? undefined);
  }

  heartRateLog(startOfDay: Date): Promise<HrSample[]> {
    const parser = new HrLogParser();
    return this.request(hrLogPacket(startOfDay), CMD.hrLog, (p) => parser.feed(p) ?? undefined);
  }

  /** Measures pulse live. The sensor reports zeros while it settles. */
  async measurePulse(timeoutMs = 40_000): Promise<number> {
    try {
      return await this.request(realTimeStartPacket(), CMD.realTimeStart, (p) => {
        const r = parseRealTime(p);
        if (r.error) throw new Error(`sensor error ${r.error}`);
        return r.value > 0 ? r.value : undefined;
      }, timeoutMs);
    } finally {
      const stop = realTimeStopPacket();
      this.log(`> ${toHex(stop)}`);
      await this.transport.write(stop).catch(() => {});
    }
  }
}
