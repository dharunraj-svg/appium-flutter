import { test } from 'node:test';

import { loadSuiteConfig } from '../../config/index.js';
import { loginAsKioskStaff } from '../../common/flows/kiosk-login.flow.js';
import { closeSession, openSession } from '../../common/support/session.js';
import { createStepRecorder } from '../../common/support/report.js';

const TEST_NAME = 'kiosk staff can sign in and leave the login screen';

test(TEST_NAME, { timeout: 300_000 }, async () => {
  const config = loadSuiteConfig({ users: ['kioskStaff'] });
  const recorder = createStepRecorder({ testFile: 'login.test.js', testName: TEST_NAME, udid: config.device.udid });
  const driver = await openSession(config);
  try {
    await loginAsKioskStaff(driver, config.users.kioskStaff, { recorder });
    await recorder.finish('PASSED');
  } catch (error) {
    await recorder.finish('FAILED', error);
    throw error;
  } finally {
    await closeSession(driver);
  }
});
