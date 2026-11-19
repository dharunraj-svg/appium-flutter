import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, describe } from 'node:test';

import { caseTest } from '../../cases/index.js';
import { loadSuiteConfig } from '../../config/index.js';
import { attemptClockInWithWrongCredentials } from '../../common/flows/kiosk-clock-auth-failure.flow.js';
import { clockInAndOut } from '../../common/flows/kiosk-clock.flow.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { openCheckInOut } from '../../common/flows/kiosk-navigation.flow.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { grantLocationPermission, screenshot } from '../../common/support/simulator.js';

// Deliberately not read from .env — this must stay wrong regardless of
// whatever real PIN is configured for KIOSK_EMPLOYEE_PASSWORD_OR_PIN.
const WRONG_PIN = '9999';

// Confirmed by packages/logic/test/api/employee_clock_auth_test.dart
// ("maps the legacy incorrect PIN/password response").
const EXPECTED_ERROR = 'Incorrect PIN or password. Please try again.';

// Runs all the kiosk checks in ONE Appium session: one fresh install, one login,
// reused for everything after. The standalone tests/kiosk/*.test.js files each do their
// own install + login, which is for running one flow on its own.
// This file is what `npm test` runs.
//
// Order: sign-in, the clock lifecycle, the wrong-PIN check (which closes its dialog),
// then Continue on the location screen, which opens the check-in/check-out screen.
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

  function recorderFor(caseId, testName) {
    return createStepRecorder({
      testFile: 'suite.test.js',
      testName,
      udid: config.device.udid,
      platform: 'ios',
      caseId,
      app: 'kiosk',
    });
  }

  caseTest('LOGIN-001', { timeout: 300_000 }, async () => {
    const recorder = recorderFor('LOGIN-001', 'login');
    try {
      await loginAsKioskStaff(driver, config.users.kioskStaff, { recorder });
      await recorder.finish('PASSED');
    } catch (error) {
      await recorder.finish('FAILED', error);
      throw error;
    }
  });

  caseTest('KIOSK-CLK-001', { timeout: 600_000 }, async () => {
    const recorder = recorderFor('KIOSK-CLK-001', 'clock in, break, and out');
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

  caseTest('KIOSK-CLK-002', { timeout: 300_000 }, async () => {
    const recorder = recorderFor('KIOSK-CLK-002', 'wrong employee PIN rejected');
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

  caseTest('KIOSK-CLK-003', { timeout: 300_000 }, async () => {
    const recorder = recorderFor('KIOSK-CLK-003', 'continue to the check-in and check-out screen');
    try {
      await openCheckInOut(driver, {
        location: config.location,
        udid: config.device.udid,
        platform: 'ios',
        recorder,
      });
      await recorder.finish('PASSED');
    } catch (error) {
      await recorder.finish('FAILED', error);
      const logsDir = new URL('../../logs/', import.meta.url);
      await mkdir(logsDir, { recursive: true });
      await screenshot(config.device.udid, new URL('continue-failure.png', logsDir).pathname).catch(() => {});
      throw error;
    }
  });
});
