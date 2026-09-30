import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { parseSettings, settingsSchema, type Settings } from '@/domain/settings';
import { readSettingsFile, writeSettingsFile } from '@/platform/files';

interface SettingsContextValue {
  settings: Settings;
  /** Devuelve false si el cambio no es válido (p. ej. URL no permitida) y no lo guarda. */
  update(patch: Partial<Settings>): boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => parseSettings(readSettingsFile()));

  const update = useCallback(
    (patch: Partial<Settings>) => {
      const parsed = settingsSchema.safeParse({ ...settings, ...patch });
      if (!parsed.success) return false;
      writeSettingsFile(parsed.data);
      setSettings(parsed.data);
      return true;
    },
    [settings],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings fuera de SettingsProvider');
  return value;
}
