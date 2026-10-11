import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminRecoveryService, AdminRecoveryError, isCineTrackAdmin } from '../supabase/functions/server/admin-recovery.ts';
import { createRecoveryService, recoveryKey, hashCode } from '../supabase/functions/server/recovery.ts';

function fixture() {
  const actor = { id: 'admin-id', email: 'admin@cinetrack.local', app_metadata: { cinetrack_admin: true } };
  const target = { userId: 'eli-id', username: 'Eli', email: 'eli@cinetrack.local', createdAt: null };
  const records = new Map();
  const calls = { lookup: 0, passwords: 0, audits: [], issued: 0 };
  const recovery = createRecoveryService({ save: async (key, record) => records.set(key, record), consume: async () => null, updatePassword: async () => true });
  const deps = {
    getActor: async token => token === 'valid-token' ? actor : null,
    findAccount: async username => { calls.lookup++; return username === 'eli' ? target : null; },
    verifyPassword: async (user, password) => { calls.passwords++; return user.id === actor.id && password === 'admin-password'; },
    audit: async (adminId, targetId) => { calls.audits.push({ adminId, targetId }); },
    issue: async (...args) => { calls.issued++; return recovery.issue(...args); },
  };
  return { actor, target, records, calls, deps, service: createAdminRecoveryService(deps) };
}
const input = { username: 'Eli', userId: 'eli-id', password: 'admin-password', confirmed: true };
const rejectsStatus = (promise, status) => assert.rejects(promise, error => error instanceof AdminRecoveryError && error.status === status);

test('admin permission uses protected app metadata, never username or user metadata', () => {
  assert.equal(isCineTrackAdmin(null), false);
  assert.equal(isCineTrackAdmin({ id: '1', email: 'admin@cinetrack.local', user_metadata: { cinetrack_admin: true } }), false);
  assert.equal(isCineTrackAdmin({ id: '1', app_metadata: { cinetrack_admin: 'true' } }), false);
  assert.equal(isCineTrackAdmin({ id: '1', app_metadata: { cinetrack_admin: true } }), true);
});

test('missing/invalid sessions cannot look up users or issue codes', async () => {
  const { service, calls } = fixture();
  await rejectsStatus(service.lookup(undefined, 'Eli'), 401);
  await rejectsStatus(service.issue('bad-token', input), 401);
  assert.equal(calls.lookup, 0);
  assert.equal(calls.issued, 0);
});

test('regular users are rejected before any sensitive operation', async () => {
  const { service, calls, actor } = fixture();
  actor.app_metadata = {};
  await rejectsStatus(service.lookup('valid-token', 'Eli'), 403);
  await rejectsStatus(service.issue('valid-token', input), 403);
  assert.equal(calls.lookup, 0);
  assert.equal(calls.passwords, 0);
  assert.equal(calls.issued, 0);
});

test('exact lookup normalizes case and rejects invalid or unknown usernames', async () => {
  const { service, target } = fixture();
  assert.deepEqual(await service.lookup('valid-token', ' ELI '), target);
  for (const name of [null, {}, '', 'Eli@cinetrack.local', 'two words']) await rejectsStatus(service.lookup('valid-token', name), 400);
  await rejectsStatus(service.lookup('valid-token', 'unknown'), 404);
});

test('issuance requires confirmation and the admin password', async () => {
  const { service, calls } = fixture();
  await rejectsStatus(service.issue('valid-token', { ...input, confirmed: false }), 400);
  await rejectsStatus(service.issue('valid-token', { ...input, password: '' }), 400);
  await rejectsStatus(service.issue('valid-token', { ...input, password: 'wrong' }), 403);
  assert.equal(calls.issued, 0);
  assert.equal(calls.lookup, 0);
});

test('deleted/recreated accounts require a new lookup and cannot receive a code for the old ID', async () => {
  const { service, calls } = fixture();
  await rejectsStatus(service.issue('valid-token', { ...input, userId: 'old-id' }), 409);
  await rejectsStatus(service.issue('valid-token', { ...input, username: 'unknown' }), 404);
  assert.equal(calls.issued, 0);
});

test('valid issuance preserves target identity, rotates its code and never audits secrets', async () => {
  const { service, calls, records, target } = fixture();
  const first = await service.issue('valid-token', input);
  const second = await service.issue('valid-token', input);
  assert.deepEqual(second.account, target);
  assert.notEqual(first.code, second.code);
  assert.deepEqual(records.get(recoveryKey('Eli')), { userId: 'eli-id', hash: await hashCode(second.code) });
  assert.deepEqual(calls.audits, [{ adminId: 'admin-id', targetId: 'eli-id' }, { adminId: 'admin-id', targetId: 'eli-id' }]);
  assert.ok(!JSON.stringify(calls.audits).includes('admin-password'));
  assert.ok(!JSON.stringify(calls.audits).includes(second.code));
});

test('revoking admin access affects the same session before it can issue another code', async () => {
  const { service, actor, calls } = fixture();
  await service.lookup('valid-token', 'Eli');
  actor.app_metadata.cinetrack_admin = false;
  await rejectsStatus(service.issue('valid-token', input), 403);
  assert.equal(calls.issued, 0);
});

test('audit failure prevents code creation', async () => {
  const { deps, calls } = fixture();
  deps.audit = async () => { throw new Error('Audit unavailable'); };
  await assert.rejects(createAdminRecoveryService(deps).issue('valid-token', input), /Audit unavailable/);
  assert.equal(calls.issued, 0);
});
