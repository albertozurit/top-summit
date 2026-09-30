import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ZonesProvider } from '@/features/offline/ZonesProvider';
import { LimitationsNotice } from '@/features/settings/LimitationsNotice';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import { resolveLanguage } from '@/i18n';
import { logger } from '@/lib/logger';
import { installMapAssets } from '@/platform/mapAssets';
import { colors, spacing } from '@/ui/theme';

function useMapAssets(): 'loading' | 'ready' | 'error' {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    installMapAssets()
      .then(() => setState('ready'))
      .catch((e: unknown) => {
        logger.error('boot', 'no se pudieron preparar los recursos del mapa', e);
        setState('error');
      });
  }, []);
  return state;
}

function Gate({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const { t, i18n } = useTranslation();
  const assets = useMapAssets();

  useEffect(() => {
    void i18n.changeLanguage(resolveLanguage(settings.language));
  }, [i18n, settings.language]);

  if (!settings.limitationsAcceptedAt) {
    return <LimitationsNotice onAccept={() => update({ limitationsAcceptedAt: new Date().toISOString() })} />;
  }
  if (assets !== 'ready') {
    return (
      <View style={styles.center}>
        {assets === 'loading' ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.error}>{t('common.assetsError')}</Text>
        )}
      </View>
    );
  }
  return children;
}

function Screens() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="zones" options={{ title: t('zones.title') }} />
      <Stack.Screen name="legend" options={{ title: t('legend.title') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Gate>
          <ZonesProvider>
            <Screens />
          </ZonesProvider>
        </Gate>
      </SettingsProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  error: { color: colors.dangerText },
});
