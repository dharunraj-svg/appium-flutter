import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, describe } from 'node:test';

import { caseTest } from '../../cases/index.js';
import { loadSuiteConfig } from '../../config/index.js';
import { startKioskSession } from '../../common/flows/kiosk-session.flow.js';
import {
  expectTexts,
  openNewClientQr,
  registerHere,
  submitEmptyOwnerForm,
  submitInvalidOwnerForm,
} from '../../common/flows/kiosk-new-client.flow.js';
import { NewClientQrPage } from '../../common/pages/new-client-qr.page.js';
import { OwnerFormPage } from '../../common/pages/owner-form.page.js';
import { takeScreenshot } from '../../common/support/device.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession } from '../../common/support/session.js';

const TEST_FILE = 'new-client.test.js';
const READ_CASE_TIMEOUT_MS = 300_000;

// Read-only. Nothing here saves an owner or a pet. The writing cases are in
// new-client-write.test.js, run with `npm run test:new-client:write`.
function recorderFor(config, caseId, testName) {
  return createStepRecorder({
    testFile: TEST_FILE,
    testName,
    udid: config.device.udid,
    platform: config.app.platform,
    caseId,
    app: 'kiosk',
  });
}

async function runCase(recorder, body) {
  try {
    await body();
    await recorder.finish('PASSED');
  } catch (error) {
    await recorder.finish('FAILED', error);
    throw error;
  }
}

// Runs one case in its own session, so an owner form left open by one case cannot reach the next.
async function runIsolated(caseId, testName, { frameSyncOff = false } = {}, body) {
  const config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
  const recorder = recorderFor(config, caseId, testName);
  let driver = null;
  try {
    driver = await startKioskSession(config, { frameSyncOff });
    await body(driver, recorder);
    await recorder.finish('PASSED');
  } catch (error) {
    await captureFailure(config, caseId);
    await recorder.finish('FAILED', error);
    throw error;
  } finally {
    if (driver) await closeSession(driver).catch(() => {});
  }
}

// The screen as it was when the case failed. Written under logs/failures/, which the report does not clear.
async function captureFailure(config, caseId) {
  const dir = new URL('../../logs/failures/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await takeScreenshot(config.app.platform, config.device.udid, new URL(`${caseId}.png`, dir).pathname).catch(() => {});
}

// The dialog, its QR, and the owner form are opened, and the owner form is left without
// saving. Order matters: the dialog must be open for QR-004.
describe('kiosk new client — dialog and owner form (read-only, one shared session)', () => {
  let driver;
  let config;

  before(async () => {
    config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
    driver = await startKioskSession(config);
  });

  after(async () => {
    await closeSession(driver);
  });

  caseTest('KIOSK-NEW-001', { timeout: READ_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-NEW-001', 'New client opens the QR dialog');
    await runCase(recorder, async () => {
      await openNewClientQr(driver, recorder);
      await expectTexts(driver, ['Download our app', 'Register Here'], recorder);
    });
  });

  caseTest('KIOSK-QR-004', { timeout: READ_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-QR-004', 'New client QR code is drawn');
    await runCase(recorder, async () => {
      const qr = new NewClientQrPage(driver);
      assert.ok(await qr.isQrDrawn(), 'QR image is not drawn in the New client dialog');
      assert.equal(await qr.isUnavailableShown(), false, '"QR code unavailable" is shown');
      await recorder.step('QR image drawn; "QR code unavailable" not shown');
    });
  });

  caseTest('KIOSK-NEW-002', { timeout: READ_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-NEW-002', 'Register Here opens Add Pet Owner in create mode');
    await runCase(recorder, async () => {
      await registerHere(driver, recorder);
      assert.ok(await new OwnerFormPage(driver).isTitleShown(), '"Add Pet Owner" is not shown');
      await expectTexts(driver, ['Email *', 'Create Password *'], recorder);
    });
  });
});

// The owner form has spinners, so frame sync is off. Each case starts its own session.
describe('kiosk new client — owner form validation (one session per case, read-only)', () => {
  caseTest('KIOSK-NEW-003', { timeout: READ_CASE_TIMEOUT_MS }, async () => {
    await runIsolated('KIOSK-NEW-003', 'Empty owner form shows required errors', { frameSyncOff: true }, async (driver, recorder) => {
      await openNewClientQr(driver, recorder);
      await registerHere(driver, recorder);
      await submitEmptyOwnerForm(driver, recorder);
      await expectTexts(driver, ['Required'], recorder);
      assert.ok(await new OwnerFormPage(driver).isTitleShown(), 'owner form closed after an empty submit');
    });
  });

  caseTest('KIOSK-NEW-004', { timeout: READ_CASE_TIMEOUT_MS }, async () => {
    await runIsolated('KIOSK-NEW-004', 'Invalid mobile, email and password are rejected', { frameSyncOff: true }, async (driver, recorder) => {
      await openNewClientQr(driver, recorder);
      await registerHere(driver, recorder);
      await submitInvalidOwnerForm(driver, recorder);
      await expectTexts(
        driver,
        [
          'Enter a valid 10-digit number',
          'Enter a valid email',
          'Password must contain at least one lowercase letter',
        ],
        recorder,
      );
      assert.ok(await new OwnerFormPage(driver).isTitleShown(), 'owner form closed after invalid values');
    });
  });
});
