import { i18n } from '@/i18n';

import { zoneStatusText } from './statusText';

describe('zoneStatusText', () => {
  beforeAll(() => i18n.changeLanguage('es'));

  it('muestra el progreso con porcentaje y bytes', () => {
    const text = zoneStatusText(
      {
        status: 'downloading',
        fileIndex: 0,
        receivedBytes: 512 * 1024 * 1024,
        totalBytes: 1024 * 1024 * 1024,
      },
      i18n.t,
      'es-ES',
    );
    expect(text).toMatch(/^Descargando 50 %/);
    expect(text).toContain('512 MB');
  });

  it('traduce los códigos de error', () => {
    expect(zoneStatusText({ status: 'error', code: 'verify_md5', message: 'x' }, i18n.t, 'es-ES')).toBe(
      'Error: El fichero descargado está dañado (md5).',
    );
  });

  it('muestra «Disponible offline»', () => {
    expect(zoneStatusText({ status: 'available' }, i18n.t, 'es-ES')).toBe('Disponible offline');
  });
});
