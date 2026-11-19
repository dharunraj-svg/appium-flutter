import { mkdir } from 'node:fs/promises';

import { caseTest } from '../../cases/index.js';
import { hasBiometricSetup } from '../../config/apps.js';
import { loadSuiteConfig } from '../../config/index.js';
import { loginAsStaff } from '../../common/flows/staff-login.flow.js';
import { setLocation, takeScreenshot } from '../../common/support/device.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession, openSession } from '../../common/support/session.js';

// Sign-in is the same LoginGate in every staff app (kennel, groomers), so these
// checks run against each of them on iOS and Android, with the same staff
// credentials. Location is mocked before sign-in because the shared login
// checks the device is inside the account's geofence. The kiosk runs LOGIN-001
// through its own login keys. LOGIN-004 runs on kennel and groomers only.
const SIGN_IN_TEST_NAME = 'staff can sign in and leave the login screen';
const BIOMETRIC_TEST_NAME = 'biometric setup prompt after sign-in can be skipped';

async function runSignIn({ caseId, testName, expectBiometricSetup = false }) {
  const config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
  const { platform } = config.app;

  const recorder = createStepRecorder({
    testFile: 'staff-login.test.js',
    testName: `${testName} (${config.app.displayName})`,
    udid: config.device.udid,
    platform,
    caseId,
    app: config.app.name.replace(/-android$/, ''),
  });
  const driver = await openSession(config);
  try {
    await setLocation(platform, config.device.udid, config.location);
    const { biometricSetupShown } = await loginAsStaff(driver, config.users.kioskStaff, {
      keyPrefix: config.app.loginKeyPrefix,
      biometricSetup: config.app.biometricSetupPrompt === true,
      recorder,
    });
    if (expectBiometricSetup && !biometricSetupShown) {
      throw new Error(
        'The biometric setup sheet did not appear after sign-in. The device needs Face ID or a fingerprint enrolled, and biometric login must be off for it.',
      );
    }
    await recorder.finish('PASSED');
  } catch (error) {
    await recorder.finish('FAILED', error);
    const logsDir = new URL('../../logs/', import.meta.url);
    await mkdir(logsDir, { recursive: true });
    const screenshotName = `${platform}-${caseId.toLowerCase()}-failure.png`;
    await takeScreenshot(platform, config.device.udid, new URL(screenshotName, logsDir).pathname).catch(() => {});
    throw error;
  } finally {
    await closeSession(driver);
  }
}

caseTest('LOGIN-001', { timeout: 300_000 }, () => runSignIn({ caseId: 'LOGIN-001', testName: SIGN_IN_TEST_NAME }));

caseTest('LOGIN-004', { timeout: 300_000, skip: !hasBiometricSetup() }, () =>
  runSignIn({ caseId: 'LOGIN-004', testName: BIOMETRIC_TEST_NAME, expectBiometricSetup: true }),
);
