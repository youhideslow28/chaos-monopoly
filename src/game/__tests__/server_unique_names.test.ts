import { describe, it, expect } from 'vitest';
import { RoomManager, uniqueSeatName } from '../../server/roomManager';
import { RoomRepository } from '../../server/roomRepository';

describe('uniqueSeatName', () => {
  it('keeps a name that is not taken', () => {
    expect(uniqueSeatName([{ name: 'An' }], 'Bình')).toBe('Bình');
  });

  it('suffixes duplicates case-insensitively and stays within 24 chars', () => {
    expect(uniqueSeatName([{ name: 'An' }], 'an')).toBe('an 2');
    expect(uniqueSeatName([{ name: 'An' }, { name: 'An 2' }], 'An')).toBe('An 3');
    const long = 'A'.repeat(24);
    const out = uniqueSeatName([{ name: long }], long);
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out).not.toBe(long);
  });
});

describe('RoomManager default naming', () => {
  const make = () =>
    new RoomManager({
      repository: new RoomRepository(':memory:'),
      onBroadcastToRoom: () => {},
    });

  it('gives joiners distinct names even when everyone picks the same one', () => {
    const mgr = make();
    const created = mgr.createRoom({ sessionPlayerId: 's1', playerName: 'Minh', capacity: 3 });
    if (!created.ok) throw new Error('create failed');
    const code = created.data!.room.roomCode;

    const j2 = mgr.joinRoom({ roomCode: code, sessionPlayerId: 's2', playerName: 'Minh' });
    const j3 = mgr.joinRoom({ roomCode: code, sessionPlayerId: 's3', playerName: '' });
    if (!j2.ok || !j3.ok) throw new Error('join failed');

    const names = j3.data!.room.seats.map((s) => s.name);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(3);
    expect(names[1]).toBe('Minh 2');
    expect(names[2]).toBe('Người chơi 3');
  });

  it('creates rooms in classic mode by default', () => {
    const mgr = make();
    const created = mgr.createRoom({ sessionPlayerId: 's1', playerName: 'Minh' });
    if (!created.ok) throw new Error('create failed');
    expect(created.data!.room.config.gameMode).toBe('CLASSIC');
  });
});
