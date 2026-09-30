// Módulos nativos que no existen en Jest: los tests de la app simulan src/platform directamente.
jest.mock('@maplibre/maplibre-react-native', () => ({}));
