import type { ConfigContext, ExpoConfig } from 'expo/config';

// El bundle identifier no debe cambiar a partir de M3: cambiarlo instala una app
// nueva y los datos locales de la anterior se pierden (ver docs/distribution.md).
const BUNDLE_ID = 'com.albertozurita.topsummit';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Top Summit',
  slug: 'top-summit',
  scheme: 'topsummit',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      CFBundleDevelopmentRegion: 'es',
      CFBundleLocalizations: ['es', 'en'],
      ITSAppUsesNonExemptEncryption: false,
      // Permite http solo hacia la red local (servidor de zonas de prueba en el PC).
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
    },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    '@maplibre/maplibre-react-native',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Top Summit usa tu ubicación para mostrar tu posición en el mapa. La ubicación no sale del iPhone.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        motionUsagePermission: false,
        // Solo para el spike S1: comprobar que una firma con Apple ID gratuita acepta
        // UIBackgroundModes=location. El tracking en segundo plano no se usa hasta M3.
        isIosBackgroundLocationEnabled: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    manifestUrl: process.env.EXPO_PUBLIC_MANIFEST_URL ?? '',
  },
});
