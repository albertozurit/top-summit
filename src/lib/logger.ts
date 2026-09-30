type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = __DEV__ ? 'debug' : 'info';

/** Redondea coordenadas a ~1 km para no dejar la posición exacta en los logs. */
export function redactCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function log(level: Level, scope: string, message: string, detail?: unknown) {
  if (order[level] < order[minLevel]) return;
  const line = `[${level}] ${scope}: ${message}`;
  const args = detail === undefined ? [line] : [line, detail];
  if (level === 'error') console.error(...args);
  else if (level === 'warn') console.warn(...args);
  // eslint-disable-next-line no-console
  else console.log(...args);
}

export const logger = {
  debug: (scope: string, message: string, detail?: unknown) => log('debug', scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) => log('info', scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => log('warn', scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => log('error', scope, message, detail),
};
