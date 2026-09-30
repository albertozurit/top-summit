import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { es } from './es';

export type AppLanguage = 'es' | 'en';

export function systemLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';
}

export function resolveLanguage(setting: 'system' | AppLanguage): AppLanguage {
  return setting === 'system' ? systemLanguage() : setting;
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: systemLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  initAsync: false,
});

export { i18n };
