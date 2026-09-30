import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { validManifest } from '@/domain/__fixtures__/manifest';
import { i18n } from '@/i18n';

import { SettingsProvider } from '../settings/SettingsProvider';
import { ZonesProvider } from './ZonesProvider';
import { ZonesScreen } from './ZonesScreen';

const GB = 1024 * 1024 * 1024;
const mockDisk = { free: 10 * GB };
const mockStart = jest.fn();

jest.mock('@/platform/files', () => ({
  listZoneIds: () => [],
  readZoneRecord: () => undefined,
  readPendingDownload: () => undefined,
  zoneFileSizes: () => ({}),
  availableDiskSpace: () => mockDisk.free,
  deleteZone: jest.fn(),
  readManifestCacheFile: () => undefined,
  writeManifestCacheFile: jest.fn(),
  readSettingsFile: () => ({
    schemaVersion: 1,
    language: 'es',
    limitationsAcceptedAt: '2026-09-30T00:00:00Z',
    manifestUrl: 'https://example.com/zones/manifest.json',
  }),
  writeSettingsFile: jest.fn(),
  writePendingDownload: jest.fn(),
  clearPendingDownload: jest.fn(),
  writeZoneRecord: jest.fn(),
  zoneFile: (zoneId: string, name: string) => ({
    uri: `file:///docs/zones/${zoneId}/${name}`,
    exists: false,
  }),
  fileMd5: jest.fn(),
  readFileHeader: jest.fn(),
}));
jest.mock('@/platform/download', () => ({
  FileTransfer: {
    start: (...args: unknown[]) => {
      mockStart(...args);
      return { run: () => new Promise(() => undefined), pause: jest.fn(), cancel: jest.fn() };
    },
    resume: jest.fn(),
  },
}));
jest.mock('@/platform/network', () => ({ useIsOnline: () => true }));
jest.mock('@/platform/keepAwake', () => ({ useKeepAwakeWhile: jest.fn() }));
jest.mock('@/platform/appInfo', () => ({ buildManifestUrl: () => undefined }));
jest.mock('./ZonesMap', () => ({ ZonesMap: () => null }));

async function renderScreen() {
  await render(
    <SettingsProvider>
      <ZonesProvider>
        <ZonesScreen />
      </ZonesProvider>
    </SettingsProvider>,
  );
  await waitFor(() => expect(screen.getByText('Valle de Benasque')).toBeTruthy());
}

describe('ZonesScreen', () => {
  beforeAll(() => i18n.changeLanguage('es'));

  beforeEach(() => {
    mockDisk.free = 10 * GB;
    mockStart.mockClear();
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(validManifest()),
    })) as unknown as typeof fetch;
  });

  it('lista las zonas del catálogo con tamaño y estado', async () => {
    await renderScreen();
    expect(screen.getByText(/Tamaño: 1[,.]5 KB/)).toBeTruthy();
    expect(screen.getByText('No descargada')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/zones/manifest.json', expect.anything());
  });

  it('no empieza la descarga si no queda el margen de espacio libre', async () => {
    mockDisk.free = 100 * 1024 * 1024;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();
    await fireEvent.press(screen.getByText('Descargar'));
    expect(alert).toHaveBeenCalledWith('Zonas offline', expect.stringContaining('No hay espacio suficiente'));
    expect(mockStart).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('empieza la descarga del primer fichero resolviendo su URL', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Descargar'));
    expect(mockStart).toHaveBeenCalledWith(
      'https://example.com/zones/benasque-vector.pmtiles',
      expect.objectContaining({ uri: 'file:///docs/zones/benasque/vector.pmtiles.download' }),
      expect.any(Function),
    );
    expect(screen.getByText(/^Descargando 0 %/)).toBeTruthy();
    expect(screen.getByText('Pausar')).toBeTruthy();
  });
});
