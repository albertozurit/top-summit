import { z } from 'zod';

import { parseManifest, type Manifest } from '@/domain/manifest';
import { err, ok, type Result } from '@/domain/result';
import { readManifestCacheFile, writeManifestCacheFile } from '@/platform/files';

export interface ManifestSnapshot {
  url: string;
  fetchedAt: string;
  manifest: Manifest;
}

const MAX_MANIFEST_BYTES = 1_000_000;
const TIMEOUT_MS = 15_000;

const cacheSchema = z.object({ url: z.string(), fetchedAt: z.string(), manifest: z.unknown() });

export function readCachedManifest(url: string): ManifestSnapshot | undefined {
  const cached = cacheSchema.safeParse(readManifestCacheFile());
  if (!cached.success || cached.data.url !== url) return undefined;
  const manifest = parseManifest(cached.data.manifest);
  return manifest.ok ? { url, fetchedAt: cached.data.fetchedAt, manifest: manifest.value } : undefined;
}

/** Descarga y valida el manifest. Solo se cachea si es válido. */
export async function fetchManifest(url: string): Promise<Result<ManifestSnapshot>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return err(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_MANIFEST_BYTES) return err('manifest demasiado grande');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return err('el manifest no es JSON');
    }
    const manifest = parseManifest(json);
    if (!manifest.ok) return err(manifest.error);
    const snapshot = { url, fetchedAt: new Date().toISOString(), manifest: manifest.value };
    writeManifestCacheFile({ ...snapshot, manifest: json });
    return ok(snapshot);
  } catch (e) {
    return err(
      controller.signal.aborted ? 'tiempo de espera agotado' : e instanceof Error ? e.message : String(e),
    );
  } finally {
    clearTimeout(timer);
  }
}
