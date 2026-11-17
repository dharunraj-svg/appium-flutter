import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { attemptClockInWithWrongCredentials } from '../../common/flows/kiosk-clock-auth-failure.flow.js';
import { clockInAndOut } from '../../common/flows/kiosk-clock.flow.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { grantLocationPermission, screenshot } from '../../common/support/simulator.js';

// Deliberately not read from .env — this must stay wrong regardless of
// whatever real PIN is configured for KIOSK_EMPLOYEE_PASSWORD_OR_PIN.
const WRONG_PIN = '9999';

// Confirmed by packages/logic/test/api/employee_clock_auth_test.dart
// ("maps the legacy incorrect PIN/password response").
const EXPECTED_ERROR = 'Incorrect PIN or password. Please try again.';

// Runs all three kiosk checks in ONE Appium session: one fresh install, one
// login, reused for everything after. The standalone tests/kiosk/*.test.js
// files each do their own full install + login from scratch, which is
// correct for running one of them in isolation but wastes a full
// install-and-relaunch cycle per test when you really want to run all three.
// This file is what `npm test` runs; the standalone files are still there
// for debugging a single flow on its own.
describe('kiosk suite (one shared app session)', () => {
  let driver;
  let config;

  before(async () => {
    config = loadSuiteConfig({ users: ['kioskStaff', 'employee'], location: true });
    driver = await openSession(config);
    // Appium reinstalls the app on this one openSession call (noReset:
    // false), and an iOS install wipes any previously granted TCC
    // permission for the bundle id — so this has to run after install, not
    // before.
    await grantLocationPermission(config.device.udid, config.app.bundleId);
  });

  after(async () => {
    await closeSession(driver);
  });

  test('kiosk staff can sign in and leave the login screen', { timeout: 300_000 }, async () => {
    const recorder = createStepRecorder({ testFile: 'suite.test.js', testName: 'login', udid: config.device.udid });
    try {
      await loginAsKioskStaff(driver, config.users.kioskStaff, { recorder });
      await recorder.finish('PASSED');
    } catch (error) {
      await recorder.finish('FAILED', error);
      throw error;
    }
  });

  test('kiosk staff signs in, then an employee clocks in and out', { timeout: 600_000 }, async () => {
    const recorder = createStepRecorder({
      testFile: 'suite.test.js',
      testName: 'clock in, break, and out',
      udid: config.device.udid,
    });
    try {
      // Already logged in by the previous test — clockInAndOut picks up
      // from wherever the app currently is, it doesn't assume a fresh launch.
      await clockInAndOut(driver, {
        employee: config.users.employee,
        location: config.location,
        udid: config.device.udid,
        recorder,
      });
      await recorder.finish('PASSED');
    } catch (error) {
      await recorder.finish('FAILED', error);
      const logsDir = new URL('../../logs/', import.meta.url);
      await mkdir(logsDir, { recursive: true });
      await screenshot(config.device.udid, new URL('clock-in-out-failure.png', logsDir).pathname).catch(() => {});
      throw error;
    }
  });

  test('kiosk rejects a wrong employee PIN on the clock-in dialog', { timeout: 300_000 }, async () => {
    const recorder = createStepRecorder({
      testFile: 'suite.test.js',
      testName: 'wrong employee PIN rejected',
      udid: config.device.udid,
    });
    try {
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
    }
  });
});
