import { en } from './en';
import { es } from './es';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function placeholders(value: unknown): string[] {
  return (
    JSON.stringify(value)
      .match(/\{\{\w+\}\}/g)
      ?.sort() ?? []
  );
}

describe('traducciones', () => {
  it('inglés y español tienen las mismas claves y longitudes de lista', () => {
    expect(keys(en)).toEqual(keys(es));
  });

  it('usan los mismos marcadores de interpolación', () => {
    expect(placeholders(en)).toEqual(placeholders(es));
  });
});
