import { readEnv } from './env.js';

export function readKioskStaff(source = process.env) {
  const email = readEnv('KIOSK_TEST_EMAIL', source)?.trim();
  const password = readEnv('KIOSK_TEST_PASSWORD', source);
  if (!email || !password) {
    throw new Error('KIOSK_TEST_EMAIL and KIOSK_TEST_PASSWORD must both be set (kiosk staff login).');
  }
  return { email, password };
}

// Password for the QA pet owner created by the new-client write cases. Fixed for
// every run, so no .env entry is needed.
export const NEW_OWNER_PASSWORD = 'a12345678';

export function readEmployee(source = process.env) {
  const email = readEnv('KIOSK_EMPLOYEE_EMAIL', source)?.trim();
  const password = readEnv('KIOSK_EMPLOYEE_PASSWORD_OR_PIN', source);
  if (!email || !password) {
    throw new Error(
      'KIOSK_EMPLOYEE_EMAIL and KIOSK_EMPLOYEE_PASSWORD_OR_PIN must both be set (clock-in account).',
    );
  }
  return { email, password };
}
