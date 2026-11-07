import type { BandTransport, FoundDevice } from './client';

export const bluetoothSupported = false;

/** The web build only previews the UI, so it has no Bluetooth. */
export class BleTransport implements BandTransport {
  scan(_onDevice: (d: FoundDevice) => void) { return () => {}; }
  async connect() { throw new Error('Bluetooth is not available in the web preview'); }
  async write() { throw new Error('Bluetooth is not available in the web preview'); }
  onPacket() {}
  onDisconnect() {}
  async disconnect() {}
}
