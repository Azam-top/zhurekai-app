import { useState } from 'react';
import { addDays, dateKey, formatDate } from '../lib/dates';
import { adherence, periodSummary } from '../lib/logic';
import { exportPdf } from '../lib/pdf';
import { buildReportHtml } from '../lib/report';
import { useLang, useStore, useT } from '../lib/store';
import { Banner, Button, Card, Screen, Segmented, SubHeader, T } from '../ui/kit';

export default function Report() {
  const { state } = useStore();
  const t = useT();
  const lang = useLang();
  const [period, setPeriod] = useState<'14' | '30' | '90'>('14');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const today = dateKey(new Date());
  const from = addDays(today, -(Number(period) - 1));
  const a = adherence(state, from, today);
  const s = periodSummary(state, from, today);

  const make = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await exportPdf(buildReportHtml(state, t, lang, Number(period)), t('reportHeading'));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SubHeader title={t('reportTitle')} />
      <Segmented value={period} onChange={setPeriod} options={[{ value: '14', label: t('period14') }, { value: '30', label: t('period30') }, { value: '90', label: t('period90') }]} />
      <T v="caption">{t('reportFrom', { from: formatDate(from, lang), to: formatDate(today, lang) })}</T>
      {state.band.mode === 'demo' && <Banner text={t('reportDemoWarning')} />}
      <Card>
        <T v="caption">{t('reportAdherence')}</T>
        <T v="lead">{a.percent === null ? '—' : t('reportAdherenceValue', { percent: a.percent, taken: a.taken, due: a.due })}</T>
        <T v="caption">{t('reportAvgBp')}</T>
        <T v="lead">{s.bp ? t('reportBpValue', { sys: s.bp.systolic, dia: s.bp.diastolic, count: s.bp.count }) : '—'}</T>
        <T v="caption">{t('reportAvgHr')}</T>
        <T v="lead">{s.hr === null ? '—' : `${s.hr} ${t('bpm')}`}</T>
        <T v="caption">{t('reportAvgSteps')}</T>
        <T v="lead">{s.steps === null ? '—' : s.steps.toLocaleString('ru-RU')}</T>
      </Card>
      <Button kind="primary" icon="doc" label={busy ? t('reportMaking') : t('reportMakePdf')} disabled={busy} onPress={make} />
      {failed && <Banner tint="danger" text={t('reportFailed')} />}
    </Screen>
  );
}
