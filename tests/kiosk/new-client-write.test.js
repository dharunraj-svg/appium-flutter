import { after, before, describe } from 'node:test';
import { fileURLToPath } from 'node:url';

import { caseTest } from '../../cases/index.js';
import { loadSuiteConfig } from '../../config/index.js';
import { NEW_OWNER_PASSWORD } from '../../config/users.js';
import { startKioskSession } from '../../common/flows/kiosk-session.flow.js';
import {
  expectTexts,
  fillAndSavePet,
  fillOwnerForm,
  openNewClientQr,
  registerHere,
  saveOwner,
  tapCheckInAfterPet,
} from '../../common/flows/kiosk-new-client.flow.js';
import { PetFormPage } from '../../common/pages/pet-form.page.js';
import { setFrameSync } from '../../common/support/frame-sync.js';
import { reserveOwnerIdentity } from '../../common/support/qa-data.js';
import { createStepRecorder } from '../../common/support/report.js';
import { closeSession } from '../../common/support/session.js';

const TEST_FILE = 'new-client-write.test.js';
const WRITE_CASE_TIMEOUT_MS = 600_000;
const COUNTER_FILE = fileURLToPath(new URL('../../logs/report/qa-counter.json', import.meta.url));

// Writes to UAT2. Every run creates a QA owner and a QA pet, and checks the pet owner in.
// Run it only on purpose, with `npm run test:new-client:write`. Order matters: the cases
// run in one session, from the check-in/check-out screen.
describe('kiosk new client — QA owner and pet (writes to UAT2, one session)', () => {
  let driver;
  let config;
  let identity = null;

  before(async () => {
    config = loadSuiteConfig({ users: ['kioskStaff'], location: true });
    driver = await startKioskSession(config);
    await setFrameSync(driver, false);
  });

  after(async () => {
    await closeSession(driver);
  });

  function recorderFor(caseId, testName) {
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

  caseTest('KIOSK-NEW-005', { timeout: WRITE_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor('KIOSK-NEW-005', 'Saving a QA pet owner opens Add Pet');
    await runCase(recorder, async () => {
      identity = await reserveOwnerIdentity({ counterFile: COUNTER_FILE });
      await recorder.step(`Reserved the QA owner identity (counter ${identity.counter})`);
      await openNewClientQr(driver, recorder);
      await registerHere(driver, recorder);
      await fillOwnerForm(driver, identity, NEW_OWNER_PASSWORD, recorder);
      await saveOwner(driver, recorder);
    });
  });

  caseTest('KIOSK-NEW-006', { timeout: WRITE_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor('KIOSK-NEW-006', 'Empty pet form shows required errors');
    await runCase(recorder, async () => {
      if (!identity) throw new Error('KIOSK-NEW-005 did not create the QA owner in this run.');
      await new PetFormPage(driver).submit();
      await recorder.step('Tapped Add Pet with the pet fields empty');
      await expectTexts(driver, ['Please enter pet name', 'Please select pet type'], recorder);
    });
  });

  caseTest('KIOSK-NEW-007', { timeout: WRITE_CASE_TIMEOUT_MS }, async () => {
    const recorder = recorderFor('KIOSK-NEW-007', 'QA pet saved, owner taps Check In, visit types open');
    await runCase(recorder, async () => {
      if (!identity) throw new Error('KIOSK-NEW-005 did not create the QA owner in this run.');
      await fillAndSavePet(driver, identity, recorder);
      await tapCheckInAfterPet(driver, recorder);
      await expectTexts(
        driver,
        ['Back to home', 'Membership', 'Appointment', 'Training', 'Walk-in'],
        recorder,
      );
    });
  });
});
