import * as Notifications from 'expo-notifications';
import type { T } from '../i18n';
import { LOW_SUPPLY_DAYS, supplyDaysLeft } from './logic';
import type { Med } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function remindersAllowed(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Rebuilds every reminder from the current medication list. */
export function syncReminders(meds: Med[], t: T): Promise<void> {
  // Runs one at a time, because overlapping rebuilds would schedule duplicates.
  queue = queue.then(() => rebuild(meds, t)).catch(() => {});
  return queue;
}

let queue: Promise<void> = Promise.resolve();

async function rebuild(meds: Med[], t: T): Promise<void> {
  // The permission prompt waits until there is something to remind about.
  if (!meds.some((m) => m.endDate === null) || !(await remindersAllowed())) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const med of meds.filter((m) => m.endDate === null)) {
    for (const time of med.times) {
      const [hour, minute] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: { title: t('notifDoseTitle'), body: t('notifDoseBody', { name: med.name, dose: med.dose }) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }
    const days = supplyDaysLeft(med);
    if (days !== null && days > LOW_SUPPLY_DAYS) {
      const date = new Date();
      date.setDate(date.getDate() + days - LOW_SUPPLY_DAYS);
      date.setHours(10, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: { title: t('notifSupplyTitle'), body: t('notifSupplyBody', { name: med.name, days: LOW_SUPPLY_DAYS }) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
}
