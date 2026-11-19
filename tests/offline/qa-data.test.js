import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  dateKey,
  nextCounter,
  ownerEmail,
  ownerFirstName,
  ownerMobile,
  petName,
  reserveOwnerIdentity,
} from '../../common/support/qa-data.js';

describe('QA identity data (offline)', () => {
  it('formats the local date as YYYYMMDD', () => {
    assert.equal(dateKey(new Date(2026, 10, 18, 9)), '20261118');
  });

  it('counts up within a day and restarts on a new day', () => {
    const first = nextCounter(null, '20261118');
    assert.deepEqual(first, { date: '20261118', count: 1 });
    assert.deepEqual(nextCounter(first, '20261118'), { date: '20261118', count: 2 });
    assert.deepEqual(nextCounter({ date: '20261118', count: 2 }, '20261119'), { date: '20261119', count: 1 });
  });

  it('refuses a 100th owner on the same day', () => {
    assert.throws(() => nextCounter({ date: '20261118', count: 99 }, '20261118'), /More than 99 QA owners/);
  });

  it('builds the plus-address email with a two-digit counter', () => {
    assert.equal(ownerEmail('20261118', 1), 'dharunraj+2026111801@runloyal.com');
    assert.equal(ownerEmail('20261118', 12), 'dharunraj+2026111812@runloyal.com');
  });

  it('builds the QA owner name, the 000 mobile and the QA pet name', () => {
    assert.match(ownerFirstName(), /^QA-PetOwner-[A-Z0-9]{8}$/);
    assert.match(ownerMobile(), /^000\d{7}$/);
    assert.match(petName(), /^QA-Pet-[A-Z0-9]{8}$/);
  });

  it('reserves the counter in a file and writes the next value back', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qa-data-'));
    try {
      const counterFile = join(dir, 'qa-counter.json');
      const now = new Date(2026, 10, 18, 9);
      const first = await reserveOwnerIdentity({ counterFile, now });
      const second = await reserveOwnerIdentity({ counterFile, now });
      assert.equal(first.email, 'dharunraj+2026111801@runloyal.com');
      assert.equal(second.email, 'dharunraj+2026111802@runloyal.com');
      assert.equal(first.lastName, 'RunLoyal');
      assert.deepEqual(JSON.parse(await readFile(counterFile, 'utf8')), { date: '20261118', count: 2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
