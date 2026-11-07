import { kk } from './kk';
import { ru } from './ru';
import type { Lang } from '../lib/types';

export type TKey = keyof typeof ru;
export type T = (key: TKey, params?: Record<string, string | number>) => string;

export function makeT(lang: Lang): T {
  const dict: Record<TKey, string> = lang === 'kk' ? kk : ru;
  return (key, params) => dict[key].replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? String(params[k]) : m));
}
