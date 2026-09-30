import { bytesToLatin1, parseProvisioningProfile, signatureStatus } from './provisioning';

const plist = `0\x82\x13\x9b\x06\t*\x86H<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>AppIDName</key><string>XC com albertozurita topsummit</string>
  <key>ExpirationDate</key>
  <date>2026-10-07T17:48:12Z</date>
  <key>Name</key>
  <string>iOS Team Provisioning Profile: com.albertozurita.topsummit</string>
  <key>TeamName</key>
  <string>Alberto Zurita</string>
</dict></plist>\x00\x01binario`;

describe('parseProvisioningProfile', () => {
  it('extrae caducidad, nombre y equipo', () => {
    const info = parseProvisioningProfile(plist);
    expect(info?.expiresAt.toISOString()).toBe('2026-10-07T17:48:12.000Z');
    expect(info?.teamName).toBe('Alberto Zurita');
    expect(info?.name).toMatch(/Team Provisioning Profile/);
  });

  it('devuelve null si no hay fecha', () => {
    expect(parseProvisioningProfile('<plist></plist>')).toBeNull();
    expect(parseProvisioningProfile('<key>ExpirationDate</key><date>nope</date>')).toBeNull();
  });

  it('funciona sobre bytes latin1', () => {
    const bytes = Uint8Array.from(plist, (c) => c.charCodeAt(0) & 0xff);
    expect(parseProvisioningProfile(bytesToLatin1(bytes))?.expiresAt.getUTCDate()).toBe(7);
  });
});

describe('signatureStatus', () => {
  const expires = new Date('2026-10-07T12:00:00Z');
  it.each([
    ['2026-09-30T12:00:00Z', 'ok', 7],
    ['2026-10-04T00:00:00Z', 'warning', 3],
    ['2026-10-06T00:00:00Z', 'critical', 1],
    ['2026-10-07T12:00:00Z', 'expired', 0],
    ['2026-10-09T12:00:00Z', 'expired', -2],
  ])('a fecha %s es %s', (now, level, days) => {
    const status = signatureStatus(expires, new Date(now));
    expect(status.level).toBe(level);
    expect(status.daysLeft).toBe(days);
  });
});
