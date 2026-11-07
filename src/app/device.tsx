import { useEffect } from 'react';
import { Share, View } from 'react-native';
import { useBand } from '../band/BandProvider';
import { formatDateTime } from '../lib/dates';
import { useLang, useStore, useT } from '../lib/store';
import { Banner, Button, Card, Row, Screen, SubHeader, T } from '../ui/kit';
import { font, space } from '../ui/theme';

const DEMO_ALLOWED = __DEV__ || process.env.EXPO_PUBLIC_DEMO === '1';

export default function Device() {
  const { state } = useStore();
  const band = useBand();
  const t = useT();
  const lang = useLang();
  const { mode, deviceName, battery, lastSync } = state.band;
  const { stopScan } = band;
  useEffect(() => stopScan, [stopScan]);

  const busy = band.status === 'connecting' || band.status === 'syncing';
  const errorText = { mismatch: t('deviceErrorMismatch'), connect: t('deviceErrorGeneric'), sync: t('deviceSyncFailed') };

  return (
    <Screen>
      <SubHeader title={t('deviceTitle')} />
      {band.error && <Banner tint="danger" text={errorText[band.error]} />}

      {mode === 'demo' && (
        <>
          <Banner text={t('deviceDemoActive')} />
          <Button kind="quiet" label={t('deviceDemoStop')} onPress={band.stopDemo} />
        </>
      )}

      {mode === 'real' && (
        <Card>
          <T v="lead">{t('deviceConnectedTo', { name: deviceName ?? 'Y25' })}</T>
          {battery !== null && <T>{t('deviceBattery', { level: battery })}</T>}
          {lastSync !== null && <T v="caption">{t('deviceLastSync', { time: formatDateTime(lastSync, lang) })}</T>}
          {band.status === 'idle' ? (
            <>
              <T>{t('deviceNotConnected')}</T>
              <Button label={t('deviceReconnect')} onPress={band.reconnect} />
            </>
          ) : (
            <Button label={band.status === 'syncing' ? t('deviceSyncing') : band.status === 'connecting' ? t('deviceConnecting') : t('deviceSyncNow')} disabled={band.status !== 'connected'} onPress={band.syncBand} />
          )}
          <Button kind="quiet" label={t('deviceDisconnect')} disabled={busy} onPress={band.disconnect} />
        </Card>
      )}

      {mode === 'none' && (
        <View style={{ gap: space.md }}>
          {band.supported ? (
            <>
              <T>{t('deviceStep1')}</T>
              <Button kind="primary" icon="band" disabled={band.status === 'scanning' || busy}
                label={band.status === 'scanning' ? t('deviceSearching') : busy ? t('deviceConnecting') : t('deviceSearch')} onPress={band.startScan} />
              {band.devices.length > 0 && <T v="label" style={{ fontFamily: font.semibold }}>{t('deviceFound')}</T>}
              {band.devices.map((d) => <Row key={d.id} icon="band" label={d.name} detail={d.rssi === null ? undefined : `${d.rssi} dBm`} onPress={() => band.connect(d)} />)}
            </>
          ) : <Banner text={t('deviceWebNote')} />}
          {DEMO_ALLOWED && <Button kind="quiet" label={t('deviceDemoStart')} onPress={band.startDemo} />}
        </View>
      )}

      <T v="caption">{t('deviceVibrateNote')}</T>

      {band.log.length > 0 && (
        <Card>
          <T v="label">{t('deviceLog')}</T>
          <T v="caption" selectable numberOfLines={8}>{band.log.slice(-8).join('\n')}</T>
          <Button kind="quiet" label={t('deviceLogShare')} onPress={() => Share.share({ message: band.log.join('\n') })} />
        </Card>
      )}
    </Screen>
  );
}
