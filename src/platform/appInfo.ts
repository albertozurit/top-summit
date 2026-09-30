import Constants from 'expo-constants';

export function buildManifestUrl(): string | undefined {
  const value: unknown = Constants.expoConfig?.extra?.manifestUrl;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** `development` necesita Metro; `release` lleva el JS embebido (la única válida para modo avión). */
export const buildVariant: 'development' | 'release' = __DEV__ ? 'development' : 'release';
