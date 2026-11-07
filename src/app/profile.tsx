import { useStore, useT } from '../lib/store';
import { ProfileForm } from '../ui/ProfileForm';
import { Screen, SubHeader, dismiss } from '../ui/kit';

export default function ProfileScreen() {
  const { state, update } = useStore();
  const t = useT();
  return (
    <Screen>
      <SubHeader title={t('profileTitle')} />
      <ProfileForm initial={state.profile} submitLabel={t('save')} onSubmit={(profile) => { update((s) => ({ ...s, profile })); dismiss(); }} />
    </Screen>
  );
}
