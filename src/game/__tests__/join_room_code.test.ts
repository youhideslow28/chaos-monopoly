import { describe, it, expect } from 'vitest';
import { normalizeJoinRoomCode } from '../../components/setup/GameSetupModal';
import { generateSecureRoomCode, normalizeRoomCode } from '../../server/security';

describe('normalizeJoinRoomCode', () => {
  it('accepts the full code the server generates', () => {
    const code = generateSecureRoomCode(new Set());
    expect(normalizeJoinRoomCode(code)).toBe(code);
    expect(normalizeRoomCode(normalizeJoinRoomCode(code))).toBe(code);
  });

  it('accepts just the suffix, case- and whitespace-insensitively', () => {
    expect(normalizeJoinRoomCode(' ab12 ')).toBe('CHAOS-AB12');
    expect(normalizeJoinRoomCode('chaos-ab12')).toBe('CHAOS-AB12');
  });

  it('accepts the 6-char hex fallback suffix', () => {
    expect(normalizeJoinRoomCode('CHAOS-1A2B3C')).toBe('CHAOS-1A2B3C');
  });

  it('rejects incomplete or junk input', () => {
    expect(normalizeJoinRoomCode('')).toBeNull();
    expect(normalizeJoinRoomCode('CHAOS-')).toBeNull();
    expect(normalizeJoinRoomCode('AB')).toBeNull();
    expect(normalizeJoinRoomCode('CHAOS-ABCDEFGH')).toBeNull();
    expect(normalizeJoinRoomCode('!!!')).toBeNull();
  });
});
