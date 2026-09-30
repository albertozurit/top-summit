// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', '.tools/**', 'ios/**', 'android/**', 'pipeline/**', 'dist/**', '.expo/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['jest.setup.js', '**/*.test.{ts,tsx}'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
  {
    // src/domain es TypeScript puro: testeable en Node y extraíble a un paquete.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'react-native/*'],
              message: 'src/domain no puede depender de React/React Native.',
            },
            { group: ['expo', 'expo-*', '@expo/*'], message: 'src/domain no puede depender de Expo.' },
            {
              group: ['@maplibre/maplibre-react-native'],
              message: 'src/domain no puede depender de MapLibre RN.',
            },
            {
              group: ['@/platform/*', '@/features/*', '@/ui/*'],
              message: 'src/domain no puede depender de capas superiores.',
            },
          ],
        },
      ],
    },
  },
]);
