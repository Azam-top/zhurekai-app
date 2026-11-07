import type { T } from '../i18n';
import type { Med } from './types';

export async function remindersAllowed(): Promise<boolean> { return true; }
export async function syncReminders(_meds: Med[], _t: T): Promise<void> {}
