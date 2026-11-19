// Identity data for the new-client path. Every owner and pet created here is a
// real row in UAT2, so each value carries a QA prefix and the email follows one
// pattern. The pattern lets the owner be found and reused later, for example for
// a membership purchase.
import { randomInt } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DIGITS = '0123456789';
const EMAIL_LOCAL_PART = 'dharunraj';
const EMAIL_DOMAIN = 'runloyal.com';
const OWNER_FIRST_PREFIX = 'QA-PetOwner-';
export const OWNER_LAST_NAME = 'RunLoyal';
const MOBILE_PREFIX = '000';
const PET_PREFIX = 'QA-Pet-';
const MAX_COUNTER_PER_DAY = 99;

function randomFrom(alphabet, length) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[randomInt(alphabet.length)];
  return out;
}

// Local date as YYYYMMDD.
export function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// The per-day counter. Starts at 1 on each new day and never goes above 99.
export function nextCounter(previous, key) {
  const count = previous && previous.date === key ? previous.count + 1 : 1;
  if (count > MAX_COUNTER_PER_DAY) {
    throw new Error(`More than ${MAX_COUNTER_PER_DAY} QA owners on ${key}. Continue on another day.`);
  }
  return { date: key, count };
}

export function ownerEmail(key, count) {
  return `${EMAIL_LOCAL_PART}+${key}${String(count).padStart(2, '0')}@${EMAIL_DOMAIN}`;
}

export function ownerFirstName() {
  return `${OWNER_FIRST_PREFIX}${randomFrom(ALPHANUMERIC, 8)}`;
}

// 10 digits, starting with 000. That prefix is not a usable area code, so it
// cannot match a real customer.
export function ownerMobile() {
  return `${MOBILE_PREFIX}${randomFrom(DIGITS, 7)}`;
}

export function petName() {
  return `${PET_PREFIX}${randomFrom(ALPHANUMERIC, 8)}`;
}

async function readCounter(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Reserves the next counter, writes it back, and returns the identity for one
// run. Call it once per run that writes. Read-only runs must not call it.
export async function reserveOwnerIdentity({ counterFile, now = new Date() } = {}) {
  if (!counterFile) throw new Error('reserveOwnerIdentity needs a counterFile path.');
  const key = dateKey(now);
  const next = nextCounter(await readCounter(counterFile), key);
  await mkdir(dirname(counterFile), { recursive: true });
  await writeFile(counterFile, `${JSON.stringify(next, null, 2)}\n`);
  return {
    firstName: ownerFirstName(),
    lastName: OWNER_LAST_NAME,
    email: ownerEmail(key, next.count),
    mobile: ownerMobile(),
    petName: petName(),
    counter: next.count,
    dateKey: key,
  };
}
