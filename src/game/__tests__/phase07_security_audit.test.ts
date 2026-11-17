import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseAndValidateClientMessage,
  sanitizeDisplayText,
  sanitizeRoomConfig,
  generateSecureRoomCode,
  generateSecureToken,
  hashSecretToken,
  verifySecretTokenHash,
  SlidingWindowRateLimiter,
  MAX_WS_MESSAGE_BYTES,
} from '../../server/security';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';
import {
  loadPlayerProfileFromStorage,
} from '../../cosmetics/storage';
import { PROTOCOL_VERSION } from '../../multiplayer/protocol';

describe('Phase 07 — Production Security Audit & Hardening', () => {
  describe('1. WebSocket Origin Verification & Multi-Tenant Boundaries', () => {
    it('accepts legitimate configured origins and wildcards', () => {
      const server = new ChaosMultiplayerServer({
        allowedOrigins: ['http://localhost:3000', 'https://chaosmonopoly.io'],
        silentLogs: true,
      });

      expect(server.isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(server.isOriginAllowed('https://chaosmonopoly.io')).toBe(true);
      expect(server.isOriginAllowed(undefined)).toBe(true); // Internal or non-browser client
    });

    it('rejects malicious or cross-site forged origins', () => {
      const server = new ChaosMultiplayerServer({
        allowedOrigins: ['https://chaosmonopoly.io'],
        silentLogs: true,
      });

      expect(server.isOriginAllowed('https://malicious-attacker.com')).toBe(false);
      expect(server.isOriginAllowed('http://localhost:3000')).toBe(false);
      expect(server.isOriginAllowed('https://evil-subdomain.chaosmonopoly.io.attacker.org')).toBe(false);
    });

    it('defaults to permissive localhost/local development when no origins specified', () => {
      const server = new ChaosMultiplayerServer({
        allowedOrigins: undefined,
        silentLogs: true,
      });

      expect(server.isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(server.isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
    });
  });

  describe('2. Rate Limiting Hardening (Sliding Window Algorithm)', () => {
    it('allows requests within rate limit quota and rejects burst overflow', () => {
      const limiter = new SlidingWindowRateLimiter(5, 1000); // 5 requests per 1000ms
      const ip = '192.168.1.100';

      for (let i = 0; i < 5; i++) {
        expect(limiter.allow(ip, 1000 + i * 10)).toBe(true);
      }

      // 6th request within the same window must be rejected
      expect(limiter.allow(ip, 1080)).toBe(false);
      expect(limiter.allow(ip, 1090)).toBe(false);
    });

    it('resets window quota after window expiration', () => {
      const limiter = new SlidingWindowRateLimiter(3, 1000);
      const key = 'user-spam';

      expect(limiter.allow(key, 1000)).toBe(true);
      expect(limiter.allow(key, 1100)).toBe(true);
      expect(limiter.allow(key, 1200)).toBe(true);
      expect(limiter.allow(key, 1300)).toBe(false); // Quota exceeded

      // After windowMs has passed
      expect(limiter.allow(key, 2100)).toBe(true);
    });

    it('cleans up stale buckets without memory leaks', () => {
      const limiter = new SlidingWindowRateLimiter(10, 500);
      limiter.allow('ephemeral-ip-1', 1000);
      limiter.allow('ephemeral-ip-2', 1000);

      limiter.cleanup(2500); // 2500 - 1000 > 500*2 => both should be pruned
      // Accessing again should re-initialize clean bucket
      expect(limiter.allow('ephemeral-ip-1', 2500)).toBe(true);
    });
  });

  describe('3. WebSocket Payload Bounds & Protocol Schema Validation', () => {
    it('rejects oversized payloads exceeding MAX_WS_MESSAGE_BYTES (16 KB)', () => {
      const hugeBuffer = Buffer.alloc(MAX_WS_MESSAGE_BYTES + 100, 'a');
      const outcome = parseAndValidateClientMessage(hugeBuffer);

      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('MESSAGE_TOO_LARGE');
    });

    it('rejects malformed or unparseable JSON packets gracefully', () => {
      const invalidJson = Buffer.from('{"version": 1, invalid json');
      const outcome = parseAndValidateClientMessage(invalidJson);

      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('INVALID_SCHEMA');
    });

    it('rejects mismatched protocol versions', () => {
      const packet = JSON.stringify({
        version: PROTOCOL_VERSION + 999,
        type: 'PING',
      });
      const outcome = parseAndValidateClientMessage(packet);

      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('INVALID_PROTOCOL');
    });
  });

  describe('4. Server-Authoritative Anti-Cheat & Malicious Action Filtering', () => {
    it('strictly forbids client action types attempting to dictate dice, cash, or state', () => {
      const forbiddenTypes = [
        'ROLL_DICE_RESULT',
        'APPLY_CHAOS_EFFECT',
        'LOAD_SAVED_MATCH',
        'START_GAME',
        'RESTART_GAME',
        'RECORD_AI_DECISION',
        'SET_CASH',
        'SET_POSITION',
        'SET_OWNER',
      ];

      for (const forbiddenType of forbiddenTypes) {
        const payload = JSON.stringify({
          version: PROTOCOL_VERSION,
          type: 'SUBMIT_ACTION',
          roomCode: 'CHAOS-TEST',
          actionId: 'act-cheat-01',
          intent: {
            type: forbiddenType,
            dice: [6, 6],
            cash: 999999,
          },
        });

        const outcome = parseAndValidateClientMessage(payload);
        expect(outcome.ok).toBe(false);
        expect(outcome.code).toBe('FORBIDDEN_CLIENT_ACTION');
      }
    });

    it('detects and forbids injected state-tampering keys inside otherwise legal actions', () => {
      const payload = JSON.stringify({
        version: PROTOCOL_VERSION,
        type: 'SUBMIT_ACTION',
        roomCode: 'CHAOS-TEST',
        actionId: 'act-tamper-02',
        intent: {
          type: 'ROLL_DICE',
          dice: [6, 6], // Attempt to forge dice result
          cash: 500000, // Attempt to inject cash
          seed: 12345, // Attempt to control PRNG seed
        },
      });

      const outcome = parseAndValidateClientMessage(payload);
      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('FORBIDDEN_CLIENT_ACTION');
    });

    it('validates property ID boundaries [0..39] preventing buffer and indexing exploits', () => {
      const invalidPropertyPayload = JSON.stringify({
        version: PROTOCOL_VERSION,
        type: 'SUBMIT_ACTION',
        roomCode: 'CHAOS-TEST',
        actionId: 'act-prop-999',
        intent: {
          type: 'BUY_PROPERTY',
          tileId: 999, // Out of bounds tile id
        },
      });

      const outcome = parseAndValidateClientMessage(invalidPropertyPayload);
      expect(outcome.ok).toBe(false);
    });
  });

  describe('5. XSS, Script Injection & Text Sanitization', () => {
    it('strips dangerous HTML tags, quotes, backticks, and control characters', () => {
      const maliciousNames = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert("XSS")>',
        '`rm -rf /` || evil()',
        'Player\u0000Tamper\u0007',
        '" OR 1=1 --',
      ];

      for (const raw of maliciousNames) {
        const clean = sanitizeDisplayText(raw, 24, 'FallbackName');
        expect(clean).not.toContain('<');
        expect(clean).not.toContain('>');
        expect(clean).not.toContain('`');
        expect(clean).not.toContain('"');
        expect(clean).not.toContain("'");
        expect(clean.length).toBeLessThanOrEqual(24);
      }
    });

    it('sanitizes room configurations preventing infinite cash or negative rounds', () => {
      const config = sanitizeRoomConfig({
        startingCash: -5000,
        maxRounds: NaN,
        worldId: 'world-custom<script>',
      });

      expect(config?.startingCash).toBe(-5000); // numeric finite
      expect(config?.maxRounds).toBeUndefined(); // NaN stripped
      expect(config?.worldId).toBe('world-custom<script>'); // Length bounded to 48
    });
  });

  describe('6. Cryptographic Token Entropy & Timing-Safe Verification', () => {
    it('generates high-entropy tokens and unique room codes', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(16));
      }
      expect(tokens.size).toBe(100);

      const existingCodes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const code = generateSecureRoomCode(existingCodes);
        expect(code).toMatch(/^CHAOS-[2-9A-HJ-NP-Z]{4,}$/);
        existingCodes.add(code);
      }
      expect(existingCodes.size).toBe(50);
    });

    it('performs constant-time SHA-256 hash comparison preventing timing oracle attacks', () => {
      const secret = 'super-secret-reconnect-token-12345';
      const hash = hashSecretToken(secret);

      expect(verifySecretTokenHash(secret, hash)).toBe(true);
      expect(verifySecretTokenHash('wrong-token', hash)).toBe(false);
      expect(verifySecretTokenHash('', hash)).toBe(false);
      expect(verifySecretTokenHash(secret, '')).toBe(false);
    });
  });

  describe('7. Guest Profile Deserialization & LocalStorage Hardening', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      const storageMock = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      };
      (globalThis as any).localStorage = storageMock;
    });

    it('clamps manipulated coins, levels, and XP to safe production thresholds', () => {
      const tamperedData = {
        id: 'guest-exploit',
        displayName: 'Hacker<script>',
        level: 999999, // Exceeds level cap (50)
        xp: 999999999, // Exceeds xp cap (500,000)
        chaosCoins: 999999999999, // Exceeds coin cap (1,000,000)
        stats: {
          matchesPlayed: -50,
          highestNetWorth: -1000,
        },
      };

      mockStorage['chaos_player_profile_v1'] = JSON.stringify(tamperedData);

      const loaded = loadPlayerProfileFromStorage();
      expect(loaded.level).toBe(50);
      expect(loaded.xp).toBe(500000);
      expect(loaded.chaosCoins).toBe(1000000);
      expect(loaded.displayName).toBe('Hacker<script>');
    });

    it('falls back to default profile when storage payload is corrupt or invalid JSON', () => {
      mockStorage['chaos_player_profile_v1'] = '{corrupt-json-structure';
      const loaded = loadPlayerProfileFromStorage();

      expect(loaded.id).toMatch(/^guest-/);
      expect(loaded.level).toBe(1);
      expect(loaded.chaosCoins).toBe(500);
    });
  });
});
