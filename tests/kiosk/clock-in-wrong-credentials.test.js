import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { attemptClockInWithWrongCredentials } from '../../common/flows/kiosk-clock-auth-failure.flow.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { screenshot } from '../../common/support/simulator.js';
import { createStepRecorder } from '../../common/support/report.js';

// Deliberately not read from .env — this must stay wrong regardless of
// whatever real PIN is configured for KIOSK_EMPLOYEE_PASSWORD_OR_PIN.
const WRONG_PIN = '9999';

// Confirmed by packages/logic/test/api/employee_clock_auth_test.dart
// ("maps the legacy incorrect PIN/password response").
const EXPECTED_ERROR = 'Incorrect PIN or password. Please try again.';

const TEST_NAME = 'kiosk rejects a wrong employee PIN on the clock-in dialog';

test(TEST_NAME, { timeout: 300_000 }, async () => {
  const config = loadSuiteConfig({ users: ['kioskStaff', 'employee'] });
  const recorder = createStepRecorder({
    testFile: 'clock-in-wrong-credentials.test.js',
    testName: TEST_NAME,
    udid: config.device.udid,
  });
  const driver = await openSession(config);
  try {
    // This test is rejected at authentication, before any clock action runs
    // _checkLocation() — no location permission or simulated GPS is needed.
    await loginAsKioskStaff(driver, config.users.kioskStaff, { recorder });
    const errorText = await attemptClockInWithWrongCredentials(driver, {
      email: config.users.employee.email,
      wrongCredential: WRONG_PIN,
      recorder,
    });
    assert.equal(errorText, EXPECTED_ERROR);
    await recorder.finish('PASSED');
  } catch (error) {
    await recorder.finish('FAILED', error);
    const logsDir = new URL('../../logs/', import.meta.url);
    await mkdir(logsDir, { recursive: true });
    await screenshot(config.device.udid, new URL('wrong-credentials-failure.png', logsDir).pathname).catch(() => {});
    throw error;
  } finally {
    await closeSession(driver);
  }
});
