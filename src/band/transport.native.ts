import { BleManager, type Subscription } from 'react-native-ble-plx';
import type { BandTransport, FoundDevice } from './client';
import { UART_RX, UART_SERVICE, UART_TX } from './protocol';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

export function decodeBase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0, acc = 0, j = 0;
  for (const c of clean) {
    acc = (acc << 6) | B64.indexOf(c);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[j++] = (acc >> bits) & 255; }
  }
  return out;
}

export const bluetoothSupported = true;

export class BleTransport implements BandTransport {
  private manager = new BleManager();
  private deviceId: string | null = null;
  private packetCb: (p: Uint8Array) => void = () => {};
  private disconnectCb: () => void = () => {};
  private subs: Subscription[] = [];

  scan(onDevice: (d: FoundDevice) => void) {
    const start = () => this.manager.startDeviceScan(null, null, (error, device) => {
      if (error || !device) return;
      const name = device.name ?? device.localName;
      if (name) onDevice({ id: device.id, name, rssi: device.rssi });
    });
    const stateSub = this.manager.onStateChange((state) => {
      if (state === 'PoweredOn') { stateSub.remove(); start(); }
    }, true);
    return () => { stateSub.remove(); this.manager.stopDeviceScan(); };
  }

  async connect(id: string) {
    this.manager.stopDeviceScan();
    const device = await this.manager.connectToDevice(id, { timeout: 15000 });
    await device.discoverAllServicesAndCharacteristics();
    const services = await device.services();
    if (!services.some((s) => s.uuid.toUpperCase() === UART_SERVICE)) {
      await device.cancelConnection().catch(() => {});
      throw new Error(`PROTOCOL_MISMATCH services=${services.map((s) => s.uuid).join(',')}`);
    }
    this.deviceId = id;
    this.subs.push(
      device.monitorCharacteristicForService(UART_SERVICE, UART_TX, (error, ch) => {
        if (!error && ch?.value) this.packetCb(decodeBase64(ch.value));
      }),
      device.onDisconnected(() => {
        this.cleanup();
        this.disconnectCb();
      }),
    );
  }

  async write(packet: Uint8Array) {
    if (!this.deviceId) throw new Error('not connected');
    await this.manager.writeCharacteristicWithoutResponseForDevice(this.deviceId, UART_SERVICE, UART_RX, encodeBase64(packet));
  }

  onPacket(cb: (p: Uint8Array) => void) { this.packetCb = cb; }
  onDisconnect(cb: () => void) { this.disconnectCb = cb; }

  async disconnect() {
    const id = this.deviceId;
    this.cleanup();
    if (id) await this.manager.cancelDeviceConnection(id).catch(() => {});
  }

  private cleanup() {
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    this.deviceId = null;
  }
}
