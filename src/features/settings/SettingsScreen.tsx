import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { isAllowedDataUrl } from '@/domain/manifest';
import { appVersion, buildManifestUrl, buildVariant } from '@/platform/appInfo';
import { Button } from '@/ui/Button';
import { Section } from '@/ui/Section';
import { colors, radius, spacing } from '@/ui/theme';

import { useZones } from '../offline/ZonesProvider';
import { useSignature } from '../signature/useSignature';
import { LimitationsText } from './LimitationsNotice';
import { useSettings } from './SettingsProvider';

const LANGUAGES = ['system', 'es', 'en'] as const;

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-GB' : 'es-ES';
  const { settings, update } = useSettings();
  const { installed } = useZones();
  const signature = useSignature();
  const defaultUrl = buildManifestUrl();
  const [url, setUrl] = useState(settings.manifestUrl ?? '');
  const [urlError, setUrlError] = useState(false);

  const saveUrl = () => {
    const trimmed = url.trim();
    if (trimmed.length > 0 && !isAllowedDataUrl(trimmed)) {
      setUrlError(true);
      return;
    }
    setUrlError(!update({ manifestUrl: trimmed.length > 0 ? trimmed : undefined }));
  };

  const attributions = t('settings.attributionList', { returnObjects: true }) as readonly string[];
  const zoneAttributions = [...new Set(installed.flatMap((z) => z.attribution))];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title={t('settings.about')}>
        <Text style={styles.text}>
          {t('settings.version', { version: appVersion(), variant: buildVariant })}
        </Text>
      </Section>

      <Section title={t('settings.signature')}>
        {signature.kind === 'known' ? (
          <Text style={[styles.text, signature.status.level !== 'ok' && styles.danger]}>
            {signature.status.level === 'expired'
              ? t('settings.signatureExpired')
              : t('settings.signatureExpires', {
                  date: signature.info.expiresAt.toLocaleString(locale),
                  days: signature.status.daysLeft,
                })}
          </Text>
        ) : (
          <Text style={styles.muted}>
            {signature.kind === 'unknown' ? t('settings.signatureUnknown') : '…'}
          </Text>
        )}
      </Section>

      <Section title={t('settings.manifestUrl')}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="url"
          onChangeText={(value) => {
            setUrl(value);
            setUrlError(false);
          }}
          placeholder={defaultUrl ?? 'https://…/manifest.json'}
          style={[styles.input, urlError && styles.inputError]}
          value={url}
        />
        <Text style={styles.muted}>{t('settings.manifestUrlHint')}</Text>
        {defaultUrl && (
          <Text style={styles.muted}>{t('settings.manifestUrlDefault', { url: defaultUrl })}</Text>
        )}
        {urlError && <Text style={styles.danger}>{t('settings.manifestUrlInvalid')}</Text>}
        <Button compact label={t('common.save')} onPress={saveUrl} />
      </Section>

      <Section title={t('settings.language')}>
        <View style={styles.row}>
          {LANGUAGES.map((language) => (
            <Button
              compact
              key={language}
              label={language === 'system' ? t('settings.languageSystem') : language.toUpperCase()}
              onPress={() => update({ language })}
              variant={settings.language === language ? 'primary' : 'secondary'}
            />
          ))}
        </View>
      </Section>

      <Section title={t('settings.limitations')}>
        <LimitationsText />
      </Section>

      <Section title={t('settings.attributions')}>
        {attributions.map((line) => (
          <Text key={line} style={styles.text}>
            {line}
          </Text>
        ))}
        {zoneAttributions.length > 0 && (
          <>
            <Text style={styles.muted}>{t('settings.zoneAttribution')}</Text>
            {zoneAttributions.map((line) => (
              <Text key={line} style={styles.text}>
                {line}
              </Text>
            ))}
          </>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.surfaceAlt, padding: spacing.lg },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13 },
  danger: { color: colors.dangerText, fontSize: 15 },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.dangerText },
});
