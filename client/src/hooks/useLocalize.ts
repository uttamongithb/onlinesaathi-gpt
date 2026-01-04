import { useEffect } from 'react';
import { TOptions } from 'i18next';
import { useRecoilValue } from 'recoil';
import { useTranslation } from 'react-i18next';
import globalI18n, { resources } from '~/locales/i18n';
import store from '~/store';

export type TranslationKeys = keyof typeof resources.en.translation;

export default function useLocalize() {
  const lang = useRecoilValue(store.lang);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (globalI18n.language !== lang) {
      globalI18n.changeLanguage(lang);
    }
  }, [lang]);

  return (phraseKey: TranslationKeys, options?: TOptions) => t(phraseKey, options);
}
