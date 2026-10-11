import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryService, hashCode, normalizeCode, recoveryKey } from '../supabase/functions/server/recovery.ts';

function fixture(updatePassword = async () => true) {
  const records = new Map();
  const updates = [];
  const service = createRecoveryService({
    save: async (key, value) => { records.set(key, value); },
    consume: async (key, hash) => {
      const value = records.get(key);
      if (!value || value.hash !== hash) return null;
      records.delete(key);
      return value;
    },
    updatePassword: async (...args) => { updates.push(args); return updatePassword(...args); },
  });
  return { records, updates, service };
}

test('stores a digest, never the recovery secret; preserves user identity', async () => {
  const { service, records, updates } = fixture();
  const code = await service.issue(' Alice ', 'user-123');
  assert.match(normalizeCode(code), /^[a-f0-9]{64}$/);
  assert.equal(records.get(recoveryKey('alice')).hash, await hashCode(code));
  assert.ok(!JSON.stringify([...records.values()]).includes(normalizeCode(code)));
  assert.equal(await service.reset('ALICE', code.toUpperCase(), 'new-password'), true);
  assert.deepEqual(updates, [['user-123', 'new-password']]);
  assert.equal(await service.reset('alice', code, 'other-password'), false);
});

test('rotation invalidates the old code', async () => {
  const { service } = fixture();
  const old = await service.issue('alice', '123');
  const current = await service.issue('alice', '123');
  assert.notEqual(old, current);
  assert.equal(await service.reset('alice', old, 'new-password'), false);
  assert.equal(await service.reset('alice', current, 'new-password'), true);
});

test('invalid codes, unknown accounts and invalid passwords do not consume valid codes', async () => {
  const { service, updates } = fixture();
  const code = await service.issue('alice', '123');
  for (const args of [
    ['bob', code, 'new-password'], ['alice', '0'.repeat(64), 'new-password'],
    ['alice', code, 'short'], ['alice', code, 'a'.repeat(129)],
    [null, code, 'new-password'], ['alice', {}, 'new-password'],
  ]) assert.equal(await service.reset(...args), false);
  assert.equal(updates.length, 0);
  assert.equal(await service.reset('alice', code, 'new-password'), true);
});

test('concurrent redemption changes the password only once', async () => {
  const { service, updates } = fixture();
  const code = await service.issue('alice', '123');
  const results = await Promise.all(Array.from({ length: 10 }, () => service.reset('alice', code, 'new-password')));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(updates.length, 1);
});

test('an Auth failure cannot replay a consumed code', async () => {
  const { service, updates } = fixture(async () => false);
  const code = await service.issue('alice', '123');
  assert.equal(await service.reset('alice', code, 'new-password'), false);
  assert.equal(await service.reset('alice', code, 'new-password'), false);
  assert.equal(updates.length, 1);
});
