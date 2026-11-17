import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { attemptClockInWithWrongCredentials } from '../../common/flows/kiosk-clock-auth-failure.flow.js';
import { clockInAndOut } from '../../common/flows/kiosk-clock.flow.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { dumpLogcat } from '../../common/support/android.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { takeScreenshot } from '../../common/support/device.js';

// Deliberately not read from .env — this must stay wrong regardless of
// whatever real PIN is configured for KIOSK_EMPLOYEE_PASSWORD_OR_PIN.
const WRONG_PIN = '9999';

// Confirmed by packages/logic/test/api/employee_clock_auth_test.dart
// ("maps the legacy incorrect PIN/password response").
const EXPECTED_ERROR = 'Incorrect PIN or password. Please try again.';

// Android counterpart of suite.test.js — same three checks, same flows, one
// shared session. Only the device layer differs:
//   - no iOS-style TCC permission dance: `appium:autoGrantPermissions` grants
//     every manifest permission at install time, so there's no runtime
//     prompt to race against at all.
//   - GPS is mocked with `adb emu geo fix` instead of `xcrun simctl location`.
//   - screenshots come from `adb exec-out screencap` instead of `simctl io`.
describe('kiosk suite — Android (one shared app session)', () => {
  let driver;
  let config;

  before(async () => {
    config = loadSuiteConfig(
      { users: ['kioskStaff', 'employee'], location: true },
      // This file always means Android — a stray TARGET_APP left over from
      // iOS testing in the ambient environment must not redirect it.
      { ...process.env, TARGET_APP: 'kiosk-android' },
    );
    driver = await openSession(config);
  });

  after(async () => {
    await closeSession(driver);
  });

  test('kiosk staff can sign in and leave the login screen', { timeout: 300_000 }, async () => {
    const recorder = createStepRecorder({
      testFile: 'android-suite.test.js',
      testName: 'login',
      udid: config.device.udid,
    });
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
      testFile: 'android-suite.test.js',
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
        platform: 'android',
        recorder,
      });
      await recorder.finish('PASSED');
    } catch (error) {
      await recorder.finish('FAILED', error);
      const logsDir = new URL('../../logs/', import.meta.url);
      await mkdir(logsDir, { recursive: true });
      await takeScreenshot('android', config.device.udid, new URL('android-clock-in-out-failure.png', logsDir).pathname).catch(
        () => {},
      );
      await dumpLogcat(config.device.udid, new URL('android-clock-in-out-logcat-failure.txt', logsDir).pathname).catch(
        () => {},
      );
      throw error;
    }
  });

  test('kiosk rejects a wrong employee PIN on the clock-in dialog', { timeout: 300_000 }, async () => {
    const recorder = createStepRecorder({
      testFile: 'android-suite.test.js',
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
      await takeScreenshot(
        'android',
        config.device.udid,
        new URL('android-wrong-credentials-failure.png', logsDir).pathname,
      ).catch(() => {});
      throw error;
    }
  });
});
