import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { loginAsStaff } from '../../common/flows/staff-login.flow.js';
import { setLocation, takeScreenshot } from '../../common/support/device.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession, openSession } from '../../common/support/session.js';

// Sign-in is the same LoginGate in every staff app (kennel, groomers and the
// kiosk's shared login), so this one check runs against each Android app with
// the same staff credentials. Location is mocked before sign-in because the
// shared login checks the device is inside the account's geofence.
const TEST_NAME = 'staff can sign in and leave the login screen';

test(TEST_NAME, { timeout: 300_000 }, async () => {
  const config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
  if (config.app.platform !== 'android') {
    throw new Error(
      `TARGET_APP must be an Android app for this test (kiosk-android, kennel-android or groomers-android). Got "${config.app.name}".`,
    );
  }

  const recorder = createStepRecorder({
    testFile: 'android-login.test.js',
    testName: `${TEST_NAME} (${config.app.displayName})`,
    udid: config.device.udid,
    platform: 'android',
  });
  const driver = await openSession(config);
  try {
    await setLocation('android', config.device.udid, config.location);
    await loginAsStaff(driver, config.users.kioskStaff, { keyPrefix: config.app.loginKeyPrefix, recorder });
    await recorder.finish('PASSED');
  } catch (error) {
    await recorder.finish('FAILED', error);
    const logsDir = new URL('../../logs/', import.meta.url);
    await mkdir(logsDir, { recursive: true });
    await takeScreenshot('android', config.device.udid, new URL('android-login-failure.png', logsDir).pathname).catch(
      () => {},
    );
    throw error;
  } finally {
    await closeSession(driver);
  }
});
