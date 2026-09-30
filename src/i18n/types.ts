import type { es } from './es';

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

/** Mismas claves que el español (idioma de referencia), con cualquier texto. */
export type Strings = Widen<typeof es>;
