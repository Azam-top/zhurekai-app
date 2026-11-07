import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { formatDateTime } from '../lib/dates';
import { API_URL, useLang, useStore, useT } from '../lib/store';
import type { SyncOutcome } from '../lib/sync';
import { loadToken, saveToken } from '../lib/token';
import { Banner, Button, Field, Screen, Segmented, SubHeader, T } from '../ui/kit';
import { space } from '../ui/theme';

export default function Server() {
  const { state, update, uploadNow } = useStore();
  const t = useT();
  const lang = useLang();
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);

  useEffect(() => { loadToken().then((v) => { if (v) setCode(v); }).catch(() => {}); }, []);

  const message = (o: SyncOutcome): { text: string; tint: 'ok' | 'warn' | 'danger' } => {
    if (o.status === 'ok') return { text: t('syncOk', { n: o.sent }), tint: 'ok' };
    if (o.status === 'error') return { text: t('syncError', { message: o.message }), tint: 'danger' };
    const reason = { 'no-server': t('syncNoServer'), 'insecure-server': t('syncInsecure'), 'no-consent': t('syncNoConsent'), 'no-code': t('syncNoCode') }[o.reason];
    return { text: reason, tint: 'warn' };
  };

  const send = async () => {
    setBusy(true);
    setOutcome(await uploadNow());
    setBusy(false);
  };

  return (
    <Screen>
      <SubHeader title={t('syncTitle')} />
      <T>{t('syncIntro')}</T>
      {!API_URL && <Banner text={t('syncNoServer')} />}
      <View style={{ gap: space.sm }}>
        <T v="label">{t('syncConsent')}</T>
        <Segmented value={state.syncConsent ? 'yes' : 'no'} onChange={(v) => update((s) => ({ ...s, syncConsent: v === 'yes' }))}
          options={[{ value: 'no', label: t('no') }, { value: 'yes', label: t('yes') }]} />
      </View>
      <Field label={t('syncCode')} value={code} onChangeText={(v) => { setCode(v); setSaved(false); }} hint={saved ? t('syncCodeSaved') : t('syncCodeHint')} secure />
      <Button kind="quiet" label={t('syncSaveCode')} disabled={!code.trim()} onPress={async () => { await saveToken(code.trim()); setSaved(true); }} />
      {Platform.OS === 'web' && <T v="caption">{t('syncWebNote')}</T>}
      <Button label={t('syncNow')} disabled={busy} onPress={send} />
      <T v="caption">{state.lastServerSync ? t('syncLast', { time: formatDateTime(state.lastServerSync, lang) }) : t('syncNever')}</T>
      {outcome && <Banner {...message(outcome)} />}
    </Screen>
  );
}
