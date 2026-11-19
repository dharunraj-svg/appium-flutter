import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, describe } from 'node:test';

import { caseTest } from '../../cases/index.js';
import { loadSuiteConfig } from '../../config/index.js';
import { startKioskSession } from '../../common/flows/kiosk-session.flow.js';
import {
  chooseVisitType,
  ensureVisitTypes,
  expectAccountNotFound,
  openVisitTypes,
  selectVisitType,
} from '../../common/flows/kiosk-navigation.flow.js';
import { CheckInOutPage } from '../../common/pages/kiosk-check-in-out.page.js';
import { KioskMainPage, VISIT_TYPES } from '../../common/pages/kiosk-main.page.js';
import { ownerMobile } from '../../common/support/qa-data.js';
import { takeScreenshot } from '../../common/support/device.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession } from '../../common/support/session.js';

const TEST_FILE = 'kiosk-main.test.js';
const CASE_TIMEOUT_MS = 300_000;

// A generated mobile that is not a customer. Continue gives the account-not-found popup.
const NON_CUSTOMER_CONTACT = ownerMobile();

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

// Runs one case in its own session. The session always closes, so a route or the QR
// scanner left open by a failure cannot reach the next case.
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

// Read-only. Nothing here creates a booking, a check-in or an owner.
describe('kiosk main — check-in/out and visit cards (one shared session)', () => {
  let driver;
  let config;

  before(async () => {
    config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
    driver = await startKioskSession(config);
  });

  after(async () => {
    await closeSession(driver);
  });

  caseTest('KIOSK-CIO-001', { timeout: CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-CIO-001', 'check-in and check-out boxes shown');
    await runCase(recorder, async () => {
      await recorder.step('Check-in/check-out screen reached from sign-in');
      const checkInOut = new CheckInOutPage(driver);
      assert.ok(await checkInOut.isHeadingShown(), 'heading "What would you like to do?" is not shown');
      assert.ok(await checkInOut.isCheckInShown(), 'Check In box is not shown');
      assert.ok(await checkInOut.isCheckOutShown(), 'Check Out box is not shown');
      assert.ok(await checkInOut.isNewClientShown(), '"I\'m a new client" button is not shown');
      await recorder.step('Heading, Check In, Check Out and New client are shown');
    });
  });

  caseTest('KIOSK-HOME-001', { timeout: CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-HOME-001', 'visit-type screen shows four cards');
    await runCase(recorder, async () => {
      await openVisitTypes(driver, recorder);
      const main = new KioskMainPage(driver);
      assert.ok(await main.isHeroShown(), 'visit-type screen ("Back to home" chip) is not shown');
      for (const [key, label] of Object.entries(VISIT_TYPES)) {
        assert.ok(await main.isTileShown(key), `${label} card is not shown`);
      }
      await recorder.step('Membership, Appointment, Training and Walk-in cards are shown');
    });
  });

  caseTest('KIOSK-HOME-002', { timeout: CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-HOME-002', 'Continue waits for a visit type');
    await runCase(recorder, async () => {
      await ensureVisitTypes(driver, recorder);
      const main = new KioskMainPage(driver);
      assert.ok(await main.isSelectPromptShown(), '"Select a visit type to continue" is not shown');
      assert.ok(await main.isContactHintShown(), '"Please select a visit type first" is not shown');
      await recorder.step('Continue prompt and input hint are shown with no card selected');
    });
  });

  caseTest('KIOSK-HOME-007', { timeout: CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor(config, 'KIOSK-HOME-007', 'Back to home returns to check-in/out');
    await runCase(recorder, async () => {
      await ensureVisitTypes(driver, recorder);
      await new KioskMainPage(driver).tapBackToHome();
      await recorder.step('Tapped Back to home');
      assert.ok(await new CheckInOutPage(driver).isHeadingShown(), 'check-in/out heading is not shown');
    });
  });
});

// Each visit type runs in its own session: Continue pushes a route, and the next case
// must start from the check-in/check-out screen.
describe('kiosk main — Continue per visit type (one session per case)', () => {
  for (const [caseId, key, label] of [
    ['KIOSK-HOME-003', 'membership', 'Membership'],
    ['KIOSK-HOME-004', 'appointment', 'Appointment'],
    ['KIOSK-HOME-005', 'training', 'Training'],
    ['KIOSK-HOME-006', 'walkIn', 'Walk-in'],
  ]) {
    caseTest(caseId, { timeout: CASE_TIMEOUT_MS }, async () => {
      await runIsolated(caseId, `${label} then Continue shows the account-not-found popup`, { frameSyncOff: true }, async (driver, recorder) => {
        await ensureVisitTypes(driver, recorder);
        await chooseVisitType(driver, key, NON_CUSTOMER_CONTACT, recorder);
        await expectAccountNotFound(driver, recorder);
      });
    });
  }
});

// The QR scanner animates continuously, so frame sync is off for these sessions. Each
// session ends with the scanner open, which is closed by ending the session.
describe('kiosk main — QR squares (one session per case)', () => {
  for (const [caseId, key, label] of [
    ['KIOSK-QR-001', 'membership', 'Membership'],
    ['KIOSK-QR-002', 'appointment', 'Appointment'],
  ]) {
    caseTest(caseId, { timeout: CASE_TIMEOUT_MS }, async () => {
      await runIsolated(caseId, `${label} QR square opens the customer QR scanner`, { frameSyncOff: true }, async (driver, recorder) => {
        await openVisitTypes(driver, recorder);
        await selectVisitType(driver, key, recorder);
        const main = new KioskMainPage(driver);
        await main.tapQrSquare();
        await recorder.step('Tapped the QR square');
        assert.ok(await main.isScannerShown(), 'customer QR scanner did not open');
        await recorder.step('Customer QR scanner is shown');
      });
    });
  }
});
