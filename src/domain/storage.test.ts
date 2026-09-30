import { checkSpace, formatBytes } from './storage';

const MB = 1024 * 1024;

describe('checkSpace', () => {
  it('permite descargar si queda el margen', () => {
    expect(checkSpace(100 * MB, 1000 * MB, 500 * MB)).toEqual({ ok: true, remainingAfterBytes: 900 * MB });
  });
  it('bloquea si no queda el margen e indica cuánto falta', () => {
    expect(checkSpace(600 * MB, 1000 * MB, 500 * MB)).toEqual({ ok: false, shortfallBytes: 100 * MB });
  });
  it('el límite exacto es aceptable', () => {
    expect(checkSpace(500 * MB, 1000 * MB, 500 * MB).ok).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formatea en español', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(250 * MB)).toBe('250 MB');
    expect(formatBytes(1.25 * 1024 * MB)).toBe('1,3 GB');
  });
});
