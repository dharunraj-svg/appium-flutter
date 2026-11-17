import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { clockInAndOut } from '../../common/flows/kiosk-clock.flow.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { grantLocationPermission, screenshot } from '../../common/support/simulator.js';
import { createStepRecorder } from '../../common/support/report.js';

const TEST_NAME = 'kiosk staff signs in, then an employee clocks in and out';

test(TEST_NAME, { timeout: 600_000 }, async () => {
  const config = loadSuiteConfig({ users: ['kioskStaff', 'employee'], location: true });
  const recorder = createStepRecorder({ testFile: 'clock-in-out.test.js', testName: TEST_NAME, udid: config.device.udid });
  const driver = await openSession(config);
  try {
    // Appium reinstalls the app for a fresh session (noReset: false), and an
    // iOS install wipes any previously granted TCC permission for that bundle
    // id. So this has to run after the app is installed, not before — granting
    // it pre-session gets silently undone by the reinstall.
    await grantLocationPermission(config.device.udid, config.app.bundleId);
    await loginAsKioskStaff(driver, config.users.kioskStaff, { recorder });
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
  } finally {
    await closeSession(driver);
  }
});
