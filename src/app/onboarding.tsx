import { Redirect, router } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useState } from 'react';
import { useStore, useT } from '../lib/store';
import { Logo } from '../ui/Logo';
import { ProfileForm } from '../ui/ProfileForm';
import { Button, Screen, T } from '../ui/kit';
import type { Lang } from '../lib/types';

export default function Onboarding() {
  const { state, update } = useStore();
  const t = useT();
  const [step, setStep] = useState<'lang' | 'profile'>(state.lang ? 'profile' : 'lang');
  if (state.profile) return <Redirect href="/" />;

  const pick = (lang: Lang) => { update((s) => ({ ...s, lang })); setStep('profile'); };
  const deviceLang = getLocales()[0]?.languageCode;

  if (step === 'lang') {
    const options: { lang: Lang; label: string }[] = [{ lang: 'ru', label: 'Русский' }, { lang: 'kk', label: 'Қазақша' }];
    if (deviceLang === 'kk') options.reverse();
    return (
      <Screen>
        <Logo height={32} />
        <T v="hero" accessibilityRole="header">Тілді таңдаңыз{'\n'}Выберите язык</T>
        {options.map((o) => <Button key={o.lang} label={o.label} onPress={() => pick(o.lang)} />)}
      </Screen>
    );
  }

  return (
    <Screen>
      <Logo height={32} />
      <T v="title" accessibilityRole="header">{t('onbWelcomeTitle')}</T>
      <T>{t('onbWelcomeText')}</T>
      <T v="caption">{t('onbDisclaimer')}</T>
      <ProfileForm initial={null} submitLabel={t('onbAccept')} onSubmit={(profile) => {
        update((s) => ({ ...s, profile, lang: s.lang ?? 'ru' }));
        router.replace('/');
      }} />
    </Screen>
  );
}
