import type { T } from '../i18n';
import { addDays, dateKey, formatDate } from './dates';
import { adherence, bpInRange, isActiveOn, periodSummary, programDay, supplyDaysLeft } from './logic';
import type { AppState, Lang, Severity } from './types';

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function buildReportHtml(state: AppState, t: T, lang: Lang, days: number, now = new Date()): string {
  const p = state.profile;
  if (!p) throw new Error('profile required');
  const today = dateKey(now);
  const from = addDays(today, -(days - 1));
  const e = escapeHtml;
  const fmt = (k: string) => e(formatDate(k, lang));
  const a = adherence(state, from, today, now);
  const s = periodSummary(state, from, today);
  const dash = '—';
  const row = (k: string, v: string) => `<tr><th>${e(k)}</th><td>${e(v)}</td></tr>`;

  const perMed = state.meds.filter((m) => m.startDate <= today && (m.endDate === null || m.endDate >= from)).map((m) => {
    const only = adherence({ ...state, meds: [m] }, from, today, now);
    const left = supplyDaysLeft(m);
    return `<tr><td>${e(m.name)} ${e(m.dose)}</td><td>${e(m.times.join(', '))}</td><td>${only.percent === null ? dash : `${only.percent}%`}</td><td>${left === null || !isActiveOn(m, today) ? dash : e(t('reportDays', { days: left }))}</td></tr>`;
  }).join('');

  const labels: [keyof Pick<AppState['checkIns'][number], 'chestPain' | 'breath' | 'dizzy' | 'bleeding' | 'swelling'>, string][] = [
    ['chestPain', t('sChestPain')], ['breath', t('sBreath')], ['dizzy', t('sDizzy')], ['bleeding', t('sBleeding')], ['swelling', t('sSwelling')],
  ];
  const sev = (v: Severity) => t(v === 'severe' ? 'aSevere' : 'aMild');
  const symptoms = state.checkIns.filter((c) => c.date >= from && c.date <= today).sort((x, y) => y.date.localeCompare(x.date)).flatMap((c) => {
    const found = labels.filter(([k]) => c[k] !== 'none').map(([k, l]) => `${l}: ${sev(c[k])}`);
    return found.length ? [`<tr><td>${fmt(c.date)}</td><td>${e(found.join('; '))}</td></tr>`] : [];
  }).join('');

  const bp = bpInRange(state.bp, from, today).slice(0, 30).map((b) =>
    `<tr><td>${fmt(dateKey(new Date(b.at)))}</td><td>${b.systolic}/${b.diastolic}</td><td>${b.pulse ?? dash}</td></tr>`).join('');

  const minutes = (m: number | null) => (m === null ? dash : t('hoursMinutes', { h: Math.floor(m / 60), m: m % 60 }));

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${e(t('reportHeading'))}</title><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0e0f12;font-size:13px;margin:32px;line-height:1.4}
  h1{font-size:22px;margin:0 0 2px}h2{font-size:15px;margin:22px 0 6px}.brand{color:#ff4b33;font-weight:700;margin-bottom:12px}
  .muted{color:#5c5f66}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:5px 8px 5px 0;border-bottom:1px solid #e6e6e2;vertical-align:top;font-weight:400}
  th{color:#5c5f66}thead th{font-weight:600;color:#0e0f12}.warn{background:#fff3dc;color:#8a5a00;padding:8px 10px;border-radius:6px;font-weight:600;margin-top:12px}
  footer{margin-top:24px;color:#5c5f66;font-size:11px}</style></head><body>
  <div class="brand">ZhurekAI</div><h1>${e(t('reportHeading'))}</h1>
  <div class="muted">${e(p.name)} · ${e(t('reportFrom', { from: formatDate(from, lang), to: formatDate(today, lang) }))}</div>
  ${state.band.mode === 'demo' ? `<div class="warn">${e(t('reportDemoWarning'))}</div>` : ''}
  <h2>${e(t('reportTitle'))}</h2><table>
  ${row(t('emStent'), formatDate(p.stentDate, lang))}
  ${row(t('reportProgramDay'), String(programDay(p.programStart, today)))}
  ${row(t('reportAdherence'), a.percent === null ? dash : t('reportAdherenceValue', { percent: a.percent, taken: a.taken, due: a.due }))}
  ${row(t('reportAvgBp'), s.bp ? t('reportBpValue', { sys: s.bp.systolic, dia: s.bp.diastolic, count: s.bp.count }) : dash)}
  ${row(t('reportAvgHr'), s.hr === null ? dash : `${s.hr} ${t('bpm')}`)}
  ${row(t('reportAvgSteps'), s.steps === null ? dash : String(s.steps))}
  ${row(t('reportAvgSleep'), minutes(s.sleepMinutes))}
  </table>
  <h2>${e(t('tabMeds'))}</h2><table><thead><tr><th>${e(t('reportMed'))}</th><th>${e(t('medTimes'))}</th><th>${e(t('reportAdherence'))}</th><th>${e(t('reportSupply'))}</th></tr></thead><tbody>${perMed || `<tr><td colspan="4">${e(t('emNoMeds'))}</td></tr>`}</tbody></table>
  <h2>${e(t('reportSymptoms'))}</h2>${symptoms ? `<table><tbody>${symptoms}</tbody></table>` : `<p>${e(t('reportNoSymptoms'))}</p>`}
  <h2>${e(t('reportBpLog'))}</h2>${bp ? `<table><thead><tr><th>${e(t('reportDate'))}</th><th>${e(t('bpTitle'))}</th><th>${e(t('bpPulse'))}</th></tr></thead><tbody>${bp}</tbody></table>` : `<p>${dash}</p>`}
  <footer>${e(t('reportDisclaimer'))}<br>${e(t('reportGenerated', { date: formatDate(today, lang) }))}</footer></body></html>`;
}
